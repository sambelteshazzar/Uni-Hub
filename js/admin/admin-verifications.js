/* exported adminVerificationsManager */
// ============================================
// ADMIN VERIFICATIONS MODULE - Verification Queue Management
// ============================================

class AdminVerificationsManager {
  constructor () {
    this.QUEUE_KEY = STORAGE_KEYS.VERIFICATION_QUEUE;
    this.queue = this._loadQueue();
  }

  _loadQueue () {
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.get === 'function') {
      return StorageManager.get(this.QUEUE_KEY, true) || [];
    }
    return [];
  }

  _persist () {
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.set === 'function') {
      StorageManager.set(this.QUEUE_KEY, this.queue, true);
    }
  }

  getPending () {
    return this.queue.filter(v => v.status === 'pending');
  }

  getApproved () {
    return this.queue.filter(v => v.status === 'approved');
  }

  getRejected () {
    return this.queue.filter(v => v.status === 'rejected');
  }

  getAll () {
    return this.queue;
  }

  getById (id) {
    return this.queue.find(v => v.id === id) || null;
  }

  getStats () {
    return {
      total: this.queue.length,
      pending: this.getPending().length,
      approved: this.getApproved().length,
      rejected: this.getRejected().length,
    };
  }

  submit (data) {
    const entry = {
      id: 'vrf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    };
    this.queue.push(entry);
    this._persist();

    if (typeof adminAuthManager !== 'undefined' && adminAuthManager.logActivity) {
      adminAuthManager.logActivity('Verification submitted', { id: entry.id, method: data.verificationMethod, studentId: data.studentId });
    }

    return { success: true, data: entry };
  }

  approve (id, notes) {
    const entry = this.getById(id);
    if (!entry) return { success: false, error: 'Verification not found' };
    if (entry.status !== 'pending') return { success: false, error: 'Verification already reviewed' };

    entry.status = 'approved';
    entry.reviewedBy = typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser
      ? adminAuthManager.getCurrentUser()?.fullName || 'Admin'
      : 'Admin';
    entry.reviewedAt = new Date().toISOString();
    entry.reviewNotes = notes || null;
    this._persist();

    this._syncUserVerification(entry, true);

    if (typeof adminAuthManager !== 'undefined' && adminAuthManager.logActivity) {
      adminAuthManager.logActivity('Verification approved', { id, studentId: entry.studentId, fullName: entry.fullName });
    }

    return { success: true, data: entry };
  }

  reject (id, notes) {
    const entry = this.getById(id);
    if (!entry) return { success: false, error: 'Verification not found' };
    if (entry.status !== 'pending') return { success: false, error: 'Verification already reviewed' };

    entry.status = 'rejected';
    entry.reviewedBy = typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser
      ? adminAuthManager.getCurrentUser()?.fullName || 'Admin'
      : 'Admin';
    entry.reviewedAt = new Date().toISOString();
    entry.reviewNotes = notes || null;
    this._persist();

    this._syncUserVerification(entry, false);

    if (typeof adminAuthManager !== 'undefined' && adminAuthManager.logActivity) {
      adminAuthManager.logActivity('Verification rejected', { id, studentId: entry.studentId, fullName: entry.fullName, notes });
    }

    return { success: true, data: entry };
  }

  _syncUserVerification (entry, isVerified) {
    if (typeof adminUsersManager !== 'undefined') {
      const user = adminUsersManager.getUserByEmail(entry.email || entry.personalEmail || entry.universityEmail);
      if (user) {
        user.isVerified = isVerified;
        user.verifiedAt = isVerified ? new Date().toISOString() : null;
        adminUsersManager._persistUser(user);
      }
    }

    const allSessions = [];
    try {
      const raw = localStorage.getItem('unihub_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.user) {
          const matchEmail = entry.email || entry.personalEmail || entry.universityEmail;
          const matchId = entry.userId;
          if ((matchEmail && session.user.email === matchEmail) || (matchId && session.user.id === matchId)) {
            session.user.isVerified = isVerified;
            localStorage.setItem('unihub_session', JSON.stringify(session));
          }
        }
      }
    } catch (_) {}

    if (typeof StorageManager !== 'undefined' && typeof STORAGE_KEYS !== 'undefined') {
      const verKey = STORAGE_KEYS.STUDENT_VERIFICATION;
      const allKeys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('unihub_student_verification')) allKeys.push(k);
        }
      } catch (e) { console.warn('verifications: ls scan failed:', e); }

      for (const key of allKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (!data) continue;
          const matchEmail = entry.email || entry.personalEmail || entry.universityEmail;
          const matchId = entry.studentId;
          if ((matchEmail && data.studentEmail === matchEmail) ||
              (matchEmail && data.personalEmail === matchEmail) ||
              (matchId && data.studentId === matchId)) {
            data.isVerified = isVerified;
            data.isPending = false;
            data.status = isVerified ? 'approved' : 'rejected';
            data.reviewedAt = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch (e) { console.warn('verifications: key update failed:', e); }
      }
    }
  }

  delete (id) {
    const index = this.queue.findIndex(v => v.id === id);
    if (index === -1) return { success: false, error: 'Verification not found' };
    this.queue.splice(index, 1);
    this._persist();

    if (typeof adminAuthManager !== 'undefined' && adminAuthManager.logActivity) {
      adminAuthManager.logActivity('Verification deleted', { id });
    }

    return { success: true };
  }
}

const adminVerificationsManager = new AdminVerificationsManager();

window.adminVerificationsManager = adminVerificationsManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminVerificationsManager' }));
}
