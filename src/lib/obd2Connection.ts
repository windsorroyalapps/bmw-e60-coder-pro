// ==================== BACKUP PROGRESS ====================

  async addBackupProgressListener(callback: (progress: { progress: number; currentSector: string }) => void): Promise<() => void> {
    const listener = await OBD2Bridge.addListener('backupProgress', callback);
    return () => listener.remove();
  }

  // ==================== DIAGNOSTIC TROUBLE CODES ====================