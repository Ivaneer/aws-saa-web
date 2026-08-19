/**
 * AWS SAA-C03 Study App - Storage & Progress Manager
 * Handles local persistence of user test results, mastery, failed questions, preferences, and in-progress sessions.
 */

const STORAGE_KEY_PROGRESS = 'aws_saac03_progress_v1';
const STORAGE_KEY_SETTINGS = 'aws_saac03_settings_v1';
const STORAGE_KEY_HISTORY = 'aws_saac03_history_v1';
const STORAGE_KEY_SESSIONS = 'aws_saac03_active_sessions_v1';

class ProgressStorage {
    constructor() {
        this.progress = this.loadProgress();
        this.settings = this.loadSettings();
        this.history = this.loadHistory();
        this.activeSessions = this.loadActiveSessions();
    }

    loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
            if (raw) {
                const data = JSON.parse(raw);
                if (!data.answeredQuestions) data.answeredQuestions = {};
                if (!data.failedQuestions) data.failedQuestions = {};
                if (!data.masteredQuestions) data.masteredQuestions = {};
                if (!data.bookmarkedQuestions) data.bookmarkedQuestions = {};
                if (!data.moduleStats) data.moduleStats = {};

                // Sanitize failedQuestions (remove any erroneously added correct answers)
                let cleaned = false;
                for (const qid in data.failedQuestions) {
                    const failRecord = data.failedQuestions[qid];
                    const ansRecord = data.answeredQuestions[qid];
                    if (!failRecord || failRecord.failedCount === 0 || (ansRecord && ansRecord.correct && failRecord.failedCount === 0)) {
                        delete data.failedQuestions[qid];
                        cleaned = true;
                    }
                }
                if (cleaned) {
                    try {
                        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(data));
                    } catch (e) {}
                }

                return data;
            }
        } catch (e) {
            console.error('Failed to load progress from localStorage', e);
        }
        return {
            answeredQuestions: {}, // { [qid]: { selected: 'A', correct: true, timestamp: 123456, attempts: 1 } }
            failedQuestions: {},   // { [qid]: { failedCount: 1, lastAttemptCorrect: false, consecutiveSuccess: 0 } }
            masteredQuestions: {}, // { [qid]: true }
            bookmarkedQuestions: {}, // { [qid]: true }
            moduleStats: {}        // { [moduleId]: { answered: 0, correct: 0, total: 50 } }
        };
    }

    saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(this.progress));
        } catch (e) {
            console.error('Failed to save progress to localStorage', e);
        }
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
        return {
            language: 'es', // 'es' (default) or 'en'
            soundEnabled: true,
            instantFeedback: true,
            timerEnabled: true
        };
    }

    saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
        return [];
    }

    saveHistory() {
        try {
            if (this.history.length > 50) {
                this.history = this.history.slice(0, 50);
            }
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save history', e);
        }
    }

    /* -------------------------------------------------------------
     * In-Progress Test Sessions Persistence (Resume / Continue Test)
     * ------------------------------------------------------------- */
    loadActiveSessions() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('Failed to load active sessions', e);
        }
        return {};
    }

    saveActiveSessions() {
        try {
            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(this.activeSessions));
        } catch (e) {
            console.error('Failed to save active sessions', e);
        }
    }

    getActiveSession(sessionKey) {
        return this.activeSessions[sessionKey] || null;
    }

    saveActiveSession(sessionKey, sessionData) {
        if (!sessionKey || !sessionData) return;
        this.activeSessions[sessionKey] = {
            ...sessionData,
            lastUpdated: Date.now()
        };
        this.saveActiveSessions();
    }

    clearActiveSession(sessionKey) {
        if (sessionKey && this.activeSessions[sessionKey]) {
            delete this.activeSessions[sessionKey];
            this.saveActiveSessions();
        }
    }

    hasActiveSession(sessionKey) {
        return !!(this.activeSessions && this.activeSessions[sessionKey]);
    }

    /* -------------------------------------------------------------
     * Answer & Question Tracking (Strict Failed Questions Bank)
     * ------------------------------------------------------------- */
    recordAnswer(question, selectedOption, isCorrect) {
        const qid = question.id;
        const modId = question.moduleId;

        // Update answered record
        const prevAnswer = this.progress.answeredQuestions[qid];
        const attempts = (prevAnswer ? (prevAnswer.attempts || 1) : 0) + 1;

        this.progress.answeredQuestions[qid] = {
            selected: selectedOption,
            correct: isCorrect,
            timestamp: Date.now(),
            attempts: attempts,
            moduleId: modId
        };

        if (!isCorrect) {
            // ONLY if incorrect, add/update in failedQuestions
            if (!this.progress.failedQuestions[qid]) {
                this.progress.failedQuestions[qid] = {
                    failedCount: 1,
                    lastAttemptCorrect: false,
                    consecutiveSuccess: 0
                };
            } else {
                const failRecord = this.progress.failedQuestions[qid];
                failRecord.failedCount = (failRecord.failedCount || 0) + 1;
                failRecord.lastAttemptCorrect = false;
                failRecord.consecutiveSuccess = 0;
            }
            delete this.progress.masteredQuestions[qid];
        } else {
            // If user answered correctly:
            if (this.progress.failedQuestions[qid]) {
                // If it was in the failed bank and user has now solved it correctly, remove from failed bank
                delete this.progress.failedQuestions[qid];
            }
            this.progress.masteredQuestions[qid] = true;
        }

        // Recalculate module stats
        this.recalculateModuleStats(modId);
        this.saveProgress();
    }

    toggleBookmark(qid) {
        if (this.progress.bookmarkedQuestions[qid]) {
            delete this.progress.bookmarkedQuestions[qid];
        } else {
            this.progress.bookmarkedQuestions[qid] = true;
        }
        this.saveProgress();
        return !!this.progress.bookmarkedQuestions[qid];
    }

    isBookmarked(qid) {
        return !!this.progress.bookmarkedQuestions[qid];
    }

    recalculateModuleStats(modId) {
        if (!window.AWS_EXAM_DATA) return;
        const moduleObj = window.AWS_EXAM_DATA.modules.find(m => m.id === modId);
        if (!moduleObj) return;

        const modQuestions = window.AWS_EXAM_DATA.questions.filter(q => q.moduleId === modId);
        let answered = 0;
        let correct = 0;

        modQuestions.forEach(q => {
            const ans = this.progress.answeredQuestions[q.id];
            if (ans) {
                answered++;
                if (ans.correct) correct++;
            }
        });

        this.progress.moduleStats[modId] = {
            total: modQuestions.length,
            answered: answered,
            correct: correct,
            accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
            completion: Math.round((answered / modQuestions.length) * 100)
        };
    }

    recalculateAllModuleStats() {
        if (!window.AWS_EXAM_DATA) return;
        window.AWS_EXAM_DATA.modules.forEach(m => {
            this.recalculateModuleStats(m.id);
        });
        this.saveProgress();
    }

    getGlobalStats() {
        if (!window.AWS_EXAM_DATA) {
            return { totalQuestions: 676, totalAnswered: 0, totalCorrect: 0, accuracy: 0, scaledScore: 100, passed: false };
        }

        const total = window.AWS_EXAM_DATA.totalQuestions || 676;
        let answered = 0;
        let correct = 0;

        for (const qid in this.progress.answeredQuestions) {
            answered++;
            if (this.progress.answeredQuestions[qid].correct) {
                correct++;
            }
        }

        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        // AWS scale: 100 to 1000 points. Passing is 720 (72%)
        const scaledScore = answered > 0 ? Math.min(1000, Math.round(100 + (accuracy / 100) * 900)) : 100;
        const passed = scaledScore >= 720;

        return {
            totalQuestions: total,
            totalAnswered: answered,
            totalCorrect: correct,
            accuracy: accuracy,
            scaledScore: scaledScore,
            passed: passed,
            failedPendingCount: Object.keys(this.progress.failedQuestions || {}).length,
            bookmarkedCount: Object.keys(this.progress.bookmarkedQuestions || {}).length,
            masteredCount: Object.keys(this.progress.masteredQuestions || {}).length
        };
    }

    getFailedQuestions() {
        if (!window.AWS_EXAM_DATA) return [];
        const failedIds = Object.keys(this.progress.failedQuestions || {});
        return window.AWS_EXAM_DATA.questions.filter(q => failedIds.includes(q.id));
    }

    getBookmarkedQuestions() {
        if (!window.AWS_EXAM_DATA) return [];
        const bookmarkedIds = Object.keys(this.progress.bookmarkedQuestions || {});
        return window.AWS_EXAM_DATA.questions.filter(q => bookmarkedIds.includes(q.id));
    }

    addTestHistory(testRecord) {
        this.history.unshift({
            id: 'test_' + Date.now(),
            date: new Date().toISOString(),
            mode: testRecord.mode,
            title: testRecord.title,
            total: testRecord.total,
            correct: testRecord.correct,
            incorrect: testRecord.incorrect,
            accuracy: testRecord.accuracy,
            scaledScore: testRecord.scaledScore,
            passed: testRecord.passed,
            durationSeconds: testRecord.durationSeconds
        });
        this.saveHistory();
    }

    setLanguage(lang) {
        this.settings.language = (lang === 'en') ? 'en' : 'es';
        this.saveSettings();
    }

    getLanguage() {
        return this.settings.language || 'es';
    }

    resetAllProgress() {
        this.progress = {
            answeredQuestions: {},
            failedQuestions: {},
            masteredQuestions: {},
            bookmarkedQuestions: {},
            moduleStats: {}
        };
        this.activeSessions = {};
        this.history = [];
        this.saveProgress();
        this.saveActiveSessions();
        this.saveHistory();
    }

    exportDataJSON() {
        return JSON.stringify({
            progress: this.progress,
            settings: this.settings,
            history: this.history,
            activeSessions: this.activeSessions,
            exportDate: new Date().toISOString(),
            version: '1.2'
        }, null, 2);
    }

    importDataJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (data.progress) this.progress = data.progress;
            if (data.settings) this.settings = data.settings;
            if (data.history) this.history = data.history;
            if (data.activeSessions) this.activeSessions = data.activeSessions;
            this.saveProgress();
            this.saveSettings();
            this.saveActiveSessions();
            this.saveHistory();
            return true;
        } catch (e) {
            console.error('Import failed', e);
            return false;
        }
    }
}

window.appStorage = new ProgressStorage();
