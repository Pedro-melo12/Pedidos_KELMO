# Lógica de Backup e Restore - Sistema de Pedidos

A funcionalidade de Backup e Restore é um módulo fundamental do sistema responsável por exportar os dados do banco de dados para segurança (backup) e, quando necessário, importá-los novamente para recuperar o estado anterior do sistema (restore).

Abaixo está a explicação detalhada, da Service até as Rotas, com os respectivos trechos de código onde ocorre a "mágica".

---

## 1. O Serviço de Banco de Dados (`adminService.ts`)

O arquivo **`adminService.ts`** é o coração da funcionalidade, pois interage diretamente com o Prisma (ORM) para buscar ou injetar dados.

### Exportação (Backup)
Aqui, o sistema consulta as 4 tabelas principais (`usuario`, `produto`, `pedido`, `pedidoItem`), monta um grande objeto JSON contendo tudo, junto com a data/hora do backup, e o retorna como string.

```typescript
// backend/src/services/adminService.ts
async exportFullBackup() {
  const usuarios = await prisma.usuario.findMany();
  const produtos = await prisma.produto.findMany();
  const pedidos = await prisma.pedido.findMany();
  const pedidoItens = await prisma.pedidoItem.findMany();

  const fullBackup = {
    timestamp: new Date().toISOString(),
    usuarios,
    produtos,
    pedidos,
    pedidoItens
  };

  return JSON.stringify(fullBackup, null, 2);
}
```

### Importação (Restore)
A restauração recebe o objeto JSON exportado anteriomente.
O ponto crucial aqui é o `$transaction`. Ele obriga o Prisma a fazer as quatro deleções "de uma vez" para limpar a base de dados. Note como `pedidoItem` é apagado antes de `pedido` para não quebrar a chave estrangeira (Foreign Key). Depois de limpar as tabelas, ele recria todos os registros a partir dos dados do JSON.

```typescript
// backend/src/services/adminService.ts
async restoreFullBackup(data: any) {
  // Apaga os dados atuais (cuidado com as chaves estrangeiras)
  await prisma.$transaction([
    prisma.pedidoItem.deleteMany(),
    prisma.pedido.deleteMany(),
    prisma.produto.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);

  // Insere os dados novos do backup
  if (data.usuarios?.length) await prisma.usuario.createMany({ data: data.usuarios });
  if (data.produtos?.length) await prisma.produto.createMany({ data: data.produtos });
  if (data.pedidos?.length) await prisma.pedido.createMany({ data: data.pedidos });
  if (data.pedidoItens?.length) await prisma.pedidoItem.createMany({ data: data.pedidoItens });

  return { success: true };
}
```

---

## 2. O Controlador (`adminController.ts`)

O controller é o maestro: ele recebe o pedido do usuário pela Internet (via requisição HTTP) e envia a resposta com o arquivo para download (no backup) ou recebe o arquivo de upload (no restore) e chama o Service que vimos acima.

### Baixar Arquivo Específico e Download via Stream
Essa etapa lida com a busca dos arquivos locais e garante que o Backend envie o JSON para o usuário baixar no navegador contornando restrições do sistema operacional usando `fs.createReadStream`.

```typescript
// backend/src/controllers/adminController.ts
async downloadBackupFile(req: Request, res: Response) {
  try {
    const { fileName } = req.params;
    const path = require('path');
    const fs = require('fs');

    if (!fileName || fileName.includes('..')) {
      return res.status(400).json({ error: 'Nome de arquivo inválido.' });
    }

    const filePath = path.resolve(__dirname, '../../backups', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    // Envia o arquivo por partes (Stream) para evitar sobrecarga de RAM no servidor
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

### Receber Arquivo de Restore
Essa rota recebe o envio do formulário do frontend contendo um anexo (arquivo). Ele converte de "Buffer" (binário) para String UTF-8, analisa o JSON (parse) e manda para o serviço salvar no Prisma.

```typescript
// backend/src/controllers/adminController.ts
async restoreFullBackup(req: Request, res: Response) {
  try {
    const file = (req as any).file; // Recebido pelo Multer
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const fileContent = file.buffer.toString('utf-8');
    const backupData = JSON.parse(fileContent);

    await adminService.restoreFullBackup(backupData);
    
    res.json({ message: 'Backup restaurado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: `Erro ao restaurar backup: ${error.message}` });
  }
}
```

---

## 3. O Agendamento Automático (`backupScheduler.ts`)

Para não depender do Administrador ficar clicando em um botão todos os dias para salvar o banco, existe uma rotina em plano de fundo:

### Salvando localmente `createLocalBackup()`
Essa função é muito parecida com a do serviço principal, mas salva o conteúdo diretamente na pasta `backups` no HD do servidor em vez de entregar pro Frontend.

```typescript
// backend/src/utils/backupScheduler.ts
export async function createLocalBackup() {
  try {
    // Mesma lógica de busca do banco vista no service...
    const usuarios = await prisma.usuario.findMany();
    // ... [código omitido para simplificação]

    const fullBackup = { timestamp: new Date().toISOString(), usuarios /*...*/ };

    const fileName = `backup_${Date.now()}.json`;
    const backupsDir = path.resolve(__dirname, '../../backups');
    
    // Cria a pasta de backups se ela não existir
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filePath = path.join(backupsDir, fileName);
    // Escreve o JSON diretamente num arquivo do sistema
    fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
    
  } catch (error) {
    console.error('[BackupScheduler] Erro ao gerar backup automático', error);
  }
}
```

### Agenda / Cron (`setupCron`)
A biblioteca `node-cron` é responsável por invocar um agendamento temporizador. Você passa para ele uma expressão Cron (ex: `0 0 * * *` =  Todo dia à meia noite) e ela repete essa função eternamente na data/hora especificada.

```typescript
// backend/src/utils/backupScheduler.ts
export function setupCron(cronStr: string) {
  if (currentTask) {
    currentTask.stop(); // Interrompe o agendamento anterior para não rodar duplicado
  }

  const isValid = cron.validate(cronStr);
  if (!isValid) return;

  // Agenda um "timer" crônico baseado na string do cron e chama a função de salvar acima
  currentTask = cron.schedule(cronStr, () => {
    createLocalBackup();
  });
}
```

---

### Resumo Lógico

1. **Agendamento**: O Cron acorda na hora H, consulta o banco (via Prisma), converte as tabelas num JSONão e salva esse JSON num arquivo `.json` lá no servidor (pasta `/backups`).
2. **Download**: Um administrador acessa o painel, vê a lista gerida pelos arquivos em disco, clica em "Baixar" e o Express envia via Stream o pacote Json por cima do protocolo HTTP até sua máquina.
3. **Restore**: Caso ocorra desastre, o usuário sobe o JSON baixado. O backend lê esse arquivo, destrói (deleteMany) as tabelas atuais e popula (createMany) com base no JSON inserido.
