# Documentação: Sistema de Pedidos e Backups

Esta documentação fornece uma visão detalhada da aplicação, do pacote de Backup & Restore, e o passo a passo de como publicar o sistema em uma Máquina Virtual (VM). 

Para gerar o **PDF**, basta abrir a visualização deste arquivo e usar a função "Imprimir -> Salvar como PDF" do seu sistema / navegador ou editor de código.

---

## 1. Detalhamento da Aplicação

O sistema é uma plataforma completa de gestão de pedidos voltado para um fluxo de entrada e saída de produtos, contando com dois módulos distintos e uma base isolada de administração de backups.

### 1.1 Stack Tecnológico Principal
**Backend:**
- **Node.js** com **Express** e **TypeScript**: Base sólida e tipada do lado do servidor.
- **Prisma ORM**: Relaciona e valida o schema com tabelas tipadas em TS, providenciando acesso seguro e simplificado ao DB.
- **MySQL**: Banco de dados relacional (totalmente portável caso prefira Postgres depois, basta mudar o `provider` do Prisma).
- **Segurança (JWT + bcrypt)**: Segurança de login com tokens e controle de perfil (USER / ADMIN).

**Frontend:**
- **React** (via Vite): Para interfaces reativas SPA.
- **TypeScript**: Maior confiabilidade durante as requisições API e respostas, sem depender de tipagens fracas em compilação.
- **Tailwind CSS**: Estilização baseada em utilitários, garantindo um código fonte limpo de classes obsoletas.

### 1.2 Módulos do Domínio
1. **Autenticação & Autorização:** O Middleware garante rotas bloqueadas no frontend e backend baseadas no Token/Papel do usuário requisitante.
2. **Produtos & Pedidos:** Gerenciamento dos itens vendidos, onde a tabela do `Pedido` carrega as referências em bloco dos produtos vinculados numa relação "Um para Muitos" (`PedidoItem`).
3. **Painel Administrativo:** Área isolada onde o proprietário concede acessos limitados e administra os dados cruciais do servidor.

---

## 2. Detalhamento do Módulo de Backup & Restore

A aplicação possui um sistema de backup nativo, embutido no Node.js. Isso retira a dependência de agendadores externos como o `crontab` do Linux ou o próprio executável `mysqldump` do banco, tornando portável para rodar até mesmo numa hospedagem simples ou num ambiente local sem banco de dados nativo instalado globalmente.

### 2.1 Como funciona o Backup:
O backup unifica o banco inteiro num único arquivo **JSON** portátil.
1. **Resgate via ORM:** Quando acionado, o script varre as tabelas vitais em sequência (`usuarios`, `produtos`, `pedidos`, `itens`).
2. **Empacotamento:** Cria um grande objeto e o transforma num bloco JSON formatado (`JSON.stringify`).
3. **Persistência Cron (No Servidor):** 
   - Utiliza a biblioteca Node chamada `node-cron`.
   - O agendamento é carregado logo no start (ver `server.ts` chamando `initializeBackupScheduler`), persistido permanentemente via tabela `Configuracao`.
   - Todo arquivo diário do Cron é escrito dentro de uma pasta segura de trabalho: `backend/backups/`. 
4. **Download Seguro via Painel:**
   - O Backend possui a rota de download usando os Streams de leitura do Node (`fs.createReadStream`), o que oculta o link real e não permite invasões via pasta no seu servidor!

### 2.2 Como funciona o Restore:
1. **Upload em RAM:** O arquivo submetido no Frontend é capturado pelo `multer` do servidor e decodificado antes mesmo de tentar tocar nos dados.
2. **Varredura Transacional:** 
   - No `adminService`, uma Transaction (`prisma.$transaction`) entra em vigor. 
   - Ela apaga tudo da base em tempo real! Porém, a exclusão é reversa, apagando primeiro os itens do pedido, depois o pedido, para evitar o disparo de erros de chave estrangeira com violação de constrição.
3. **Insert (Restabelecimento):** O conteúdo do Backup é inserido via `createMany()` num único pulso restaurando imediatamente 100% dos dados para o momento em que a foto foi tirada.

---

## 3. Guia de Instalação e Configuração em VM (VPS / Nuvem)

Para colocar esse sistema online (DigitalOcean, AWS, Hostinger, GCP) recomendamos fortemente ambiente em **Ubuntu Linux**:

### Passo 3.1: Instalações Básicas no Terminal da VM
Acesse a sua VM via SSH e prepare-a para o Node v20 e Nginx.
```bash
sudo apt update && sudo apt upgrade -y
# Instala Banco e utilitários
sudo apt install mysql-server git nginx -y
# Puxando a V20 do Node
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
# Instalar o PM2 Global (Responsável por segurar o backend de pé)
sudo npm install -g pm2
```

### Passo 3.2: Ajuste Inicial do Banco
Acesse o prompt do MySQL (`sudo mysql -u root`) e crie seu Banco e o seu dono:
```sql
CREATE DATABASE sistema_pedidos;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'Senha_Muito_Forte_123';
GRANT ALL PRIVILEGES ON sistema_pedidos.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Passo 3.3: Configurar e Subir o Backend
Clone ou copie (via SFTP/Git) os arquivos do projeto para seu Servidor e abra a subpasta `backend`:
```bash
cd /caminho/do/seu/sistema-pedidos/backend
npm install
```
Ajuste seu ambiente de produção através de um `.env`:
```env
DATABASE_URL="mysql://appuser:Senha_Muito_Forte_123@localhost:3306/sistema_pedidos"
JWT_SECRET="CrieUmHashAleatorioComplexoAqui"
PORT=3000
```
Por fim, inicie as tabelas usando as definições oficiais (`schema.prisma`), gere a build Javascript do Typescript e entregue a tarefa ao `pm2`.
```bash
npx prisma db push
npm run build 
# Se você tiver um npm run build configurado, você usaria isso, 
# se não, com ts-node você manda o pm2 rodar via script direto:
pm2 start npm --name "api-backend" -- run dev
pm2 save
pm2 startup
```

### Passo 3.4: Construindo o Frontend (Assets Estáticos)
Agora o backend já vai estar ativo ouvindo na porta local 3000. Mas precisamos das "telas", o HTML, CSS e JS que rodam no browser.
Vá na subpasta `frontend`:
```bash
cd ../frontend
npm install
```
Edite as variáveis no seu env (ou `/src/services/api.ts`) para certificar que o app no navegador vai enviar as requisições para `https://api.seudominio.com.br` ou para a sua URL correta, não `localhost`.
```bash
npm run build
```
Depois que rodar, será criada a pasta `dist`. Copie estes arquivos para a pasta pública oficial do Linux:
```bash
sudo cp -r dist/* /var/www/html/
```

### Passo 3.5: Nginx Proxy Reverso (Servidor que mostra ao mundo)
Por fim, crie a regra ensinando o servidor as seguintes lógicas:
1. Tudo porta 80 cai no index.html
2. Tudo que vier com final `/api/` rola lá para o porta 3000 (do backend).

```bash
sudo nano /etc/nginx/sites-available/sistema-pedidos
```
Cole as diretrizes:
```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # O "Frontend"
    location / {
        root /var/www/html;
        index index.html index.htm;
        # Força leitura de Rotas Internas do Sistema no React
        try_files $uri $uri/ /index.html; 
    }

    # As requisições de Banco pro "Backend"
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Ative este arquivo com um atalho simbólico e reinicie a placa de rede embutida dele:
```bash
sudo ln -s /etc/nginx/sites-available/sistema-pedidos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

A mágica está concluída! Recomendamos executar o `sudo certbot --nginx` apenas depois de realizar todas essas etapas e vincular o seu Domínio no registro de DNS.
