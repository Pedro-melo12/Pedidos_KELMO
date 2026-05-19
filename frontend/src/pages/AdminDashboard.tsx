import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Download, Users, ClipboardList } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [backupSchedule, setBackupSchedule] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'logs'>('users');
  const [scheduleMode, setScheduleMode] = useState('disabled');
  const [dailyTime, setDailyTime] = useState('00:00');
  const [weeklyDay, setWeeklyDay] = useState('3');
  const [intervalHours, setIntervalHours] = useState('1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupsHistory, setBackupsHistory] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erro ao buscar usuários', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/admin/backup/schedule');
      if (res.data?.schedule) {
        const cron = res.data.schedule;
        setBackupSchedule(cron);

        const dailyMatch = cron.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
        const intervalMatch = cron.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
        const weeklyMatch = cron.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/);

        if (cron === '0 * * * *') {
          setScheduleMode('interval');
          setIntervalHours('1');
        } else if (intervalMatch) {
          setScheduleMode('interval');
          setIntervalHours(intervalMatch[1]);
        } else if (dailyMatch) {
          setScheduleMode('daily');
          const minute = dailyMatch[1].padStart(2, '0');
          const hour = dailyMatch[2].padStart(2, '0');
          setDailyTime(`${hour}:${minute}`);
        } else if (weeklyMatch) {
          setScheduleMode('weekly');
          const minute = weeklyMatch[1].padStart(2, '0');
          const hour = weeklyMatch[2].padStart(2, '0');
          setDailyTime(`${hour}:${minute}`);
          setWeeklyDay(weeklyMatch[3]);
        } else {
          setScheduleMode('custom');
        }
      } else {
        setBackupSchedule('');
        setScheduleMode('disabled');
      }
    } catch (err) {
      console.error('Erro ao buscar schedule', err);
    }
  };

  const fetchBackupsHistory = async () => {
    try {
      const res = await api.get('/admin/backup/list');
      setBackupsHistory(res.data);
    } catch (err) {
      console.error('Erro ao buscar histórico de backups', err);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Erro ao buscar logs', err);
      setLogsError('Erro ao buscar logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSchedule();
    fetchBackupsHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleExportBackup = async () => {
    try {
      const res = await api.get('/admin/backup/full', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup_total.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Erro ao exportar Backup');
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Mudar papel para ${newRole}?`)) return;

    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert('Erro ao atualizar papel');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) return alert('Selecione um arquivo de backup primeiro!');
    if (!window.confirm('Atenção: Restaurar um backup irá apagar todos os dados atuais. Continuar?')) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post('/admin/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Backup restaurado com sucesso!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao restaurar backup.');
      console.error(err);
    }
  };

  const handleSaveSchedule = async () => {
    let cronStr = '';
    if (scheduleMode === 'interval') {
      cronStr = intervalHours === '1' ? '0 * * * *' : `0 */${intervalHours} * * *`;
    } else if (scheduleMode === 'daily') {
      const [hour, minute] = dailyTime.split(':');
      cronStr = `${parseInt(minute)} ${parseInt(hour)} * * *`;
    } else if (scheduleMode === 'weekly') {
      const [hour, minute] = dailyTime.split(':');
      cronStr = `${parseInt(minute)} ${parseInt(hour)} * * ${parseInt(weeklyDay)}`;
    } else if (scheduleMode === 'custom') {
      cronStr = backupSchedule;
    }

    try {
      await api.post('/admin/backup/schedule', { cronStr });
      alert('Agendamento salvo com sucesso!');
      setBackupSchedule(cronStr);
    } catch (err) {
      alert('Erro ao salvar agendamento.');
    }
  };

  const handleForceBackup = async () => {
    try {
      await api.post('/admin/backup/force');
      alert('Backup gerado e salvo com no servidor sucesso!');
      fetchBackupsHistory();
    } catch (err) {
      alert('Erro ao gerar backup.');
    }
  };

  const handleDownloadBackup = async (fileName: string) => {
    try {
      const res = await api.get(`/admin/backup/download/${fileName}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Erro ao baixar arquivo de backup.');
    }
  };

  if (loading) return <div className="text-center p-8">Carregando painel admin...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'users' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'backup' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Backup
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'logs' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Logs
          </button>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">Painel Administrativo</h1>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" /> Gerenciar Usuários
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Papel (Role)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRoleChange(u.id, u.role)}
                        className="text-primary-600 hover:text-primary-900 font-medium"
                      >
                        Mudar Papel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Logs de Ação
            </h2>
            <button
              onClick={fetchLogs}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition"
            >
              Atualizar
            </button>
          </div>
          {logsLoading ? (
            <div className="text-center py-8 text-gray-600">Carregando logs...</div>
          ) : logsError ? (
            <div className="text-center py-8 text-red-600">{logsError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.evento}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.acao || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.descricao || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.usuario?.nome || log.usuario_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Nenhum log encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Backup e Restauração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Restaurar Backup</h3>
              <p className="text-sm text-gray-500">Selecione um arquivo de backup (.json) para restaurar. Atenção: isso substituirá todos os dados atuais da base!</p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
              <button
                onClick={handleRestoreBackup}
                disabled={!selectedFile}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-50"
              >
                Restaurar Dados
              </button>
            </div>
            <div className="space-y-4 border-l pl-8">
              <h3 className="font-medium text-gray-700">Agendar Backup Automático</h3>
              <p className="text-sm text-gray-500">Configure com que frequência o servidor salvará a base de dados nos seus próprios arquivos internos.</p>
              <div className="space-y-3 bg-gray-50 p-4 rounded-md border text-sm">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Modo de Agendamento</label>
                  <select
                    value={scheduleMode}
                    onChange={(e) => setScheduleMode(e.target.value)}
                    className="w-full border-gray-300 rounded-md p-2 border focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="disabled">Desativado</option>
                    <option value="interval">A cada intervalo (Várias vezes ao dia)</option>
                    <option value="daily">Horário Fixo (Uma vez ao dia)</option>
                    <option value="weekly">Semanal (Dia + Horário)</option>
                    <option value="custom">Cron Personalizado</option>
                  </select>
                </div>
                {scheduleMode === 'interval' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Intervalo em horas</label>
                    <input
                      type="number"
                      min="1"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(e.target.value)}
                      className="w-full border-gray-300 rounded-md p-2 border focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                {scheduleMode === 'daily' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Horário diário</label>
                    <input
                      type="time"
                      value={dailyTime}
                      onChange={(e) => setDailyTime(e.target.value)}
                      className="w-full border-gray-300 rounded-md p-2 border focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                {scheduleMode === 'weekly' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Dia da Semana</label>
                      <select value={weeklyDay} onChange={(e) => setWeeklyDay(e.target.value)} className="w-full border-gray-300 rounded-md p-2 border">
                        <option value="0">Domingo</option>
                        <option value="1">Segunda</option>
                        <option value="2">Terça</option>
                        <option value="3">Quarta</option>
                        <option value="4">Quinta</option>
                        <option value="5">Sexta</option>
                        <option value="6">Sábado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Horário</label>
                      <input type="time" value={dailyTime} onChange={(e) => setDailyTime(e.target.value)} className="w-full border-gray-300 rounded-md p-2 border" />
                    </div>
                  </div>
                )}
                {scheduleMode === 'custom' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Cron personalizado</label>
                    <input
                      type="text"
                      value={backupSchedule}
                      onChange={(e) => setBackupSchedule(e.target.value)}
                      placeholder="0 0 * * *"
                      className="w-full border-gray-300 rounded-md p-2 border focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleSaveSchedule}
                className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition"
              >
                Salvar Agendamento
              </button>
            </div>
          </div>
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Histórico de Backups (Servidor)</h3>
              <button
                onClick={handleForceBackup}
                className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition"
              >
                Gerar Backup Interno Agora
              </button>
            </div>
            {backupsHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum backup encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm bg-gray-50 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Arquivo</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backupsHistory.map((backup) => (
                      <tr key={backup.fileName}>
                        <td className="px-4 py-3 text-gray-900">{backup.fileName}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(backup.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDownloadBackup(backup.fileName)}
                            className="text-primary-600 hover:text-primary-900 font-medium"
                          >
                            Baixar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
