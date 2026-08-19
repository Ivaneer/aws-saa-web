/**
 * AWS Solutions Architect Associate (SAA-C03) - Main Application Logic
 * Interactive test engine, randomized question order, session resumption, bilingual toggle.
 */

(function () {
    'use strict';

    // App State
    const state = {
        currentView: 'dashboard', // 'dashboard' | 'quiz' | 'results'
        lang: 'es', // 'es' | 'en'
        questionLang: 'es', // for current question on-the-fly bilingual comparison
        currentQuiz: {
            sessionKey: null,
            title_es: '',
            title_en: '',
            mode: 'module', // 'module' | 'all' | 'exam' | 'quick' | 'failed' | 'bookmarked'
            questions: [],
            currentIndex: 0,
            userAnswers: {}, // { [index]: { selected: 'A', isCorrect: true, question: obj } }
            startTime: null,
            endTime: null,
            timerInterval: null,
            timeElapsedSeconds: 0,
            moduleId: null
        },
        reviewFilter: 'all' // 'all' | 'failed' | 'correct'
    };

    // UI Elements Cache
    let elements = {};

    function initElements() {
        elements = {
            // Views
            viewDashboard: document.getElementById('view-dashboard'),
            viewQuiz: document.getElementById('view-quiz'),
            viewResults: document.getElementById('view-results'),
            
            // Global Header
            btnGlobalLang: document.getElementById('btn-global-lang'),
            globalLangText: document.getElementById('global-lang-text'),
            btnBrandHome: document.getElementById('btn-brand-home'),
            btnHeaderReset: document.getElementById('btn-header-reset'),
            
            // Hero Actions
            btnHeroStartAll: document.getElementById('btn-hero-start-all'),
            btnHeroExam: document.getElementById('btn-hero-exam'),
            btnHeroStartText: document.getElementById('btn-hero-start-text'),
            btnHeroExamText: document.getElementById('btn-hero-exam-text'),

            // Dashboard Stats
            statScaledScore: document.getElementById('stat-scaled-score'),
            statScoreStatus: document.getElementById('stat-score-status'),
            statTotalAnswered: document.getElementById('stat-total-answered'),
            statAccuracy: document.getElementById('stat-accuracy'),
            statFailedPending: document.getElementById('stat-failed-pending'),
            statMastered: document.getElementById('stat-mastered'),
            
            // Quick Action Cards
            cardExamMode: document.getElementById('card-mode-exam'),
            cardFailedMode: document.getElementById('card-mode-failed'),
            cardQuickMode: document.getElementById('card-mode-quick'),
            cardBookmarksMode: document.getElementById('card-mode-bookmarks'),
            
            // Modules Container
            modulesGrid: document.getElementById('modules-grid'),
            
            // Quiz View
            btnQuizBack: document.getElementById('btn-quiz-back'),
            quizModuleTitle: document.getElementById('quiz-module-title'),
            quizProgressText: document.getElementById('quiz-progress-text'),
            quizProgressBar: document.getElementById('quiz-progress-bar'),
            quizTimerText: document.getElementById('quiz-timer-text'),
            btnQuestionTranslate: document.getElementById('btn-question-translate'),
            questionTranslateText: document.getElementById('question-translate-text'),
            btnQuestionBookmark: document.getElementById('btn-question-bookmark'),
            
            // Question Area
            scenarioBadge: document.getElementById('scenario-badge'),
            questionTitle: document.getElementById('question-title'),
            optionsContainer: document.getElementById('options-container'),
            explanationBox: document.getElementById('explanation-box'),
            explanationTitle: document.getElementById('explanation-title'),
            explanationText: document.getElementById('explanation-text'),
            
            // Quiz Nav
            btnPrevQuestion: document.getElementById('btn-prev-question'),
            btnNextQuestion: document.getElementById('btn-next-question'),
            btnFinishQuiz: document.getElementById('btn-finish-quiz'),
            btnOpenPalette: document.getElementById('btn-open-palette'),
            
            // Palette Modal
            paletteOverlay: document.getElementById('palette-overlay'),
            paletteClose: document.getElementById('btn-close-palette'),
            paletteGrid: document.getElementById('palette-grid'),
            
            // Results View
            resultsStatusBadge: document.getElementById('results-status-badge'),
            resultsScoreNum: document.getElementById('results-score-num'),
            resultsSubtitle: document.getElementById('results-subtitle'),
            resCorrectVal: document.getElementById('res-correct-val'),
            resIncorrectVal: document.getElementById('res-incorrect-val'),
            resAccuracyVal: document.getElementById('res-accuracy-val'),
            resTimeVal: document.getElementById('res-time-val'),
            resultsQuestionsList: document.getElementById('results-questions-list'),
            btnRepeatFailed: document.getElementById('btn-repeat-failed'),
            btnRestartQuiz: document.getElementById('btn-restart-quiz'),
            btnResultsDashboard: document.getElementById('btn-results-dashboard'),
            tabFilterAll: document.getElementById('tab-filter-all'),
            tabFilterFailed: document.getElementById('tab-filter-failed'),
            tabFilterCorrect: document.getElementById('tab-filter-correct'),
            
            // Reset Modal
            resetModalOverlay: document.getElementById('reset-modal-overlay'),
            btnCancelReset: document.getElementById('btn-cancel-reset'),
            btnConfirmReset: document.getElementById('btn-confirm-reset'),
            
            // Toast Container
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * UI Text Dictionary (Bilingual Interface)
     */
    const UI_STRINGS = {
        es: {
            brandTag: 'SAA-C03 Prep Pro',
            langButton: '🇪🇸 Español (ES)',
            translateBtn: '🇬🇧 Ver en Inglés Original',
            translateBtnBack: '🇪🇸 Ver en Español',
            heroTitle: 'Centro de Preparación AWS Solutions Architect',
            heroSubtitle: '676 preguntas verificadas organizadas en 9 módulos con explicaciones arquitectónicas detalladas.',
            heroStartAll: '🎲 Iniciar Test Aleatorio (Todos los Módulos)',
            heroContinueAll: '▶ Continuar Test General',
            heroExam: '🎯 Simulacro Oficial (65 Qs)',
            scoreLabel: 'Puntuación Estimada AWS',
            scorePassed: '✅ APROBADO (Meta: 720+)',
            scoreFailed: '⚠️ PENDIENTE (Meta: 720+)',
            metricAnswered: 'Respondidas',
            metricAccuracy: 'Precisión Global',
            metricFailed: 'Fallos por Repasar',
            metricMastered: 'Dominadas (2x)',
            quickModesTitle: 'Modos de Práctica Rápida',
            modeExamTitle: '🎯 Simulacro de Examen',
            modeExamDesc: '65 preguntas aleatorias ponderadas, simulando la experiencia oficial de certificación con tiempo.',
            modeFailedTitle: '🔄 Repaso de Fallos',
            modeFailedDesc: 'Practica únicamente las preguntas que has fallado previamente hasta conseguir dominarlas.',
            modeQuickTitle: '⚡ Práctica Rápida (20)',
            modeQuickDesc: '20 preguntas variadas al azar de todos los módulos para sesiones de estudio ágiles.',
            modeBookmarksTitle: '⭐ Preguntas Guardadas',
            modeBookmarksDesc: 'Repasa las preguntas que has marcado con estrella para estudio focalizado.',
            modulesTitle: 'Módulos de Estudio SAA-C03 (Preguntas Aleatorias)',
            questionsWord: 'preguntas',
            completedWord: 'completado',
            btnStartTest: '🎲 Iniciar Test Aleatorio',
            btnContinueTest: '▶ Continuar Test',
            btnRestartModule: '↺ Reiniciar',
            btnPrev: '← Anterior',
            btnNext: 'Siguiente →',
            btnFinish: 'Finalizar Test',
            btnPalette: 'Cuadrícula',
            whyCorrectTitle: '¿Por qué es la respuesta correcta?',
            whyFailedTitle: 'Respuesta Incorrecta - Explicación:',
            testResultsTitle: 'Resultados del Test',
            scoreScaledLabel: 'Escala AWS (100 - 1000)',
            correctStat: 'Correctas',
            incorrectStat: 'Incorrectas',
            accuracyStat: 'Precisión',
            timeStat: 'Tiempo Empleado',
            btnRepeatFailedOnly: '🔄 Repetir solo falladas',
            btnRestartCurrent: '🔁 Reiniciar test aleatorio',
            btnReturnHome: '🏠 Volver al inicio',
            filterAll: 'Todas',
            filterFailed: 'Solo Falladas',
            filterCorrect: 'Solo Acertadas',
            noFailedQuestions: '¡Excelente! No tienes preguntas falladas pendientes de repasar.',
            noBookmarkedQuestions: 'No tienes preguntas marcadas con estrella aún.',
            resetConfirmTitle: '¿Reiniciar todo el progreso?',
            resetConfirmDesc: 'Se borrarán tus respuestas guardadas, estadísticas, sesiones en curso y banco de fallos. Esta acción no se puede deshacer.',
            btnCancel: 'Cancelar',
            btnConfirm: 'Sí, reiniciar',
            toastAnswered: 'Respuesta guardada',
            toastResetOk: 'Progreso reiniciado correctamente',
            toastBookmarkAdded: 'Pregunta añadida a guardadas',
            toastBookmarkRemoved: 'Pregunta eliminada de guardadas'
        },
        en: {
            brandTag: 'SAA-C03 Prep Pro',
            langButton: '🇬🇧 English (Original)',
            translateBtn: '🇪🇸 View in Spanish (ES)',
            translateBtnBack: '🇬🇧 View in English',
            heroTitle: 'AWS Solutions Architect Preparation Hub',
            heroSubtitle: '676 verified questions organized in 9 modules with detailed architectural explanations.',
            heroStartAll: '🎲 Start Randomized Test (All Modules)',
            heroContinueAll: '▶ Continue General Test',
            heroExam: '🎯 Official Exam Simulation (65 Qs)',
            scoreLabel: 'Estimated AWS Scaled Score',
            scorePassed: '✅ PASSING (Goal: 720+)',
            scoreFailed: '⚠️ NEED WORK (Goal: 720+)',
            metricAnswered: 'Answered',
            metricAccuracy: 'Overall Accuracy',
            metricFailed: 'Pending Failed',
            metricMastered: 'Mastered (2x)',
            quickModesTitle: 'Quick Practice Modes',
            modeExamTitle: '🎯 Full Exam Simulation',
            modeExamDesc: '65 randomized weighted questions, simulating the official certification experience.',
            modeFailedTitle: '🔄 Failed Questions Review',
            modeFailedDesc: 'Practice only the questions you have missed previously until you master them.',
            modeQuickTitle: '⚡ Quick Practice (20)',
            modeQuickDesc: '20 random questions from all modules for fast and agile study sessions.',
            modeBookmarksTitle: '⭐ Saved / Bookmarked',
            modeBookmarksDesc: 'Review questions you marked with a star for targeted revision.',
            modulesTitle: 'SAA-C03 Study Modules (Randomized Order)',
            questionsWord: 'questions',
            completedWord: 'completed',
            btnStartTest: '🎲 Start Randomized Test',
            btnContinueTest: '▶ Continue Test',
            btnRestartModule: '↺ Restart',
            btnPrev: '← Previous',
            btnNext: 'Next →',
            btnFinish: 'Finish Test',
            btnPalette: 'Question Grid',
            whyCorrectTitle: 'Why is this correct?',
            whyFailedTitle: 'Incorrect Answer - Explanation:',
            testResultsTitle: 'Test Results',
            scoreScaledLabel: 'AWS Scale (100 - 1000)',
            correctStat: 'Correct',
            incorrectStat: 'Incorrect',
            accuracyStat: 'Accuracy',
            timeStat: 'Time Spent',
            btnRepeatFailedOnly: '🔄 Retry failed only',
            btnRestartCurrent: '🔁 Retake randomized test',
            btnReturnHome: '🏠 Back to Dashboard',
            filterAll: 'All',
            filterFailed: 'Failed Only',
            filterCorrect: 'Correct Only',
            noFailedQuestions: 'Great job! You have no failed questions right now.',
            noBookmarkedQuestions: 'You have no bookmarked questions yet.',
            resetConfirmTitle: 'Reset all progress?',
            resetConfirmDesc: 'All answered records, active sessions, and statistics will be cleared. This cannot be undone.',
            btnCancel: 'Cancel',
            btnConfirm: 'Yes, reset',
            toastAnswered: 'Answer saved',
            toastResetOk: 'Progress reset successfully',
            toastBookmarkAdded: 'Question saved to bookmarks',
            toastBookmarkRemoved: 'Question removed from bookmarks'
        }
    };

    /**
     * Initialize Application
     */
    async function init() {
        initElements();

        // If for any reason window.AWS_EXAM_DATA isn't present, try fetching questions.json
        if (!window.AWS_EXAM_DATA) {
            try {
                const response = await fetch('data/questions.json');
                if (response.ok) {
                    window.AWS_EXAM_DATA = await response.json();
                }
            } catch (e) {
                console.error('Fallback fetch for questions.json failed', e);
            }
        }

        if (!window.AWS_EXAM_DATA) {
            console.error('AWS_EXAM_DATA could not be loaded.');
            return;
        }

        state.lang = window.appStorage.getLanguage();
        state.questionLang = state.lang;
        window.appStorage.recalculateAllModuleStats();

        bindEvents();
        renderGlobalUI();
        renderDashboard();
    }

    /**
     * Bind Event Listeners
     */
    function bindEvents() {
        // Global Language Switch
        if (elements.btnGlobalLang) {
            elements.btnGlobalLang.addEventListener('click', () => {
                const nextLang = state.lang === 'es' ? 'en' : 'es';
                state.lang = nextLang;
                state.questionLang = nextLang;
                window.appStorage.setLanguage(nextLang);
                renderGlobalUI();
                if (state.currentView === 'dashboard') {
                    renderDashboard();
                } else if (state.currentView === 'quiz') {
                    renderCurrentQuestion();
                } else if (state.currentView === 'results') {
                    renderResultsView();
                }
            });
        }

        // Navigation
        if (elements.btnBrandHome) {
            elements.btnBrandHome.addEventListener('click', (e) => {
                e.preventDefault();
                switchView('dashboard');
            });
        }

        if (elements.btnQuizBack) {
            elements.btnQuizBack.addEventListener('click', () => {
                syncCurrentQuizSessionToStorage();
                switchView('dashboard');
            });
        }

        // Hero Actions
        if (elements.btnHeroStartAll) {
            elements.btnHeroStartAll.addEventListener('click', () => {
                startAllQuestionsMode(false);
            });
        }

        if (elements.btnHeroExam) {
            elements.btnHeroExam.addEventListener('click', () => {
                startExamMode(false);
            });
        }

        // Reset Modal
        if (elements.btnHeaderReset) {
            elements.btnHeaderReset.addEventListener('click', () => {
                if (elements.resetModalOverlay) elements.resetModalOverlay.style.display = 'flex';
            });
        }

        if (elements.btnCancelReset) {
            elements.btnCancelReset.addEventListener('click', () => {
                if (elements.resetModalOverlay) elements.resetModalOverlay.style.display = 'none';
            });
        }

        if (elements.btnConfirmReset) {
            elements.btnConfirmReset.addEventListener('click', () => {
                window.appStorage.resetAllProgress();
                if (elements.resetModalOverlay) elements.resetModalOverlay.style.display = 'none';
                showToast(t('toastResetOk'));
                renderDashboard();
            });
        }

        // Quick Mode Cards
        if (elements.cardExamMode) elements.cardExamMode.addEventListener('click', () => startExamMode(false));
        if (elements.cardFailedMode) elements.cardFailedMode.addEventListener('click', () => startFailedMode(false));
        if (elements.cardQuickMode) elements.cardQuickMode.addEventListener('click', () => startQuickMode(false));
        if (elements.cardBookmarksMode) elements.cardBookmarksMode.addEventListener('click', () => startBookmarksMode(false));

        // Quiz Navigation
        if (elements.btnPrevQuestion) elements.btnPrevQuestion.addEventListener('click', prevQuestion);
        if (elements.btnNextQuestion) elements.btnNextQuestion.addEventListener('click', nextQuestion);
        if (elements.btnFinishQuiz) elements.btnFinishQuiz.addEventListener('click', finishQuiz);

        // Question On-The-Fly Translation Button
        if (elements.btnQuestionTranslate) {
            elements.btnQuestionTranslate.addEventListener('click', () => {
                state.questionLang = state.questionLang === 'es' ? 'en' : 'es';
                renderCurrentQuestion();
            });
        }

        // Bookmark Toggle Button
        if (elements.btnQuestionBookmark) {
            elements.btnQuestionBookmark.addEventListener('click', () => {
                const currentQ = state.currentQuiz.questions[state.currentQuiz.currentIndex];
                if (!currentQ) return;
                const isNowBookmarked = window.appStorage.toggleBookmark(currentQ.id);
                elements.btnQuestionBookmark.classList.toggle('active', isNowBookmarked);
                showToast(isNowBookmarked ? t('toastBookmarkAdded') : t('toastBookmarkRemoved'));
                renderPalette();
            });
        }

        // Palette Modal
        if (elements.btnOpenPalette) {
            elements.btnOpenPalette.addEventListener('click', () => {
                renderPalette();
                if (elements.paletteOverlay) elements.paletteOverlay.classList.add('active');
            });
        }

        if (elements.paletteClose) {
            elements.paletteClose.addEventListener('click', () => {
                if (elements.paletteOverlay) elements.paletteOverlay.classList.remove('active');
            });
        }

        if (elements.paletteOverlay) {
            elements.paletteOverlay.addEventListener('click', (e) => {
                if (e.target === elements.paletteOverlay) {
                    elements.paletteOverlay.classList.remove('active');
                }
            });
        }

        // Results View Actions
        if (elements.btnRestartQuiz) elements.btnRestartQuiz.addEventListener('click', restartCurrentQuiz);
        if (elements.btnRepeatFailed) elements.btnRepeatFailed.addEventListener('click', repeatFailedFromCurrentQuiz);
        if (elements.btnResultsDashboard) elements.btnResultsDashboard.addEventListener('click', () => switchView('dashboard'));

        // Filter Tabs in Results
        if (elements.tabFilterAll) elements.tabFilterAll.addEventListener('click', () => setReviewFilter('all'));
        if (elements.tabFilterFailed) elements.tabFilterFailed.addEventListener('click', () => setReviewFilter('failed'));
        if (elements.tabFilterCorrect) elements.tabFilterCorrect.addEventListener('click', () => setReviewFilter('correct'));

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', handleKeydown);
    }

    /**
     * Keyboard Shortcut Handler
     */
    function handleKeydown(e) {
        if (state.currentView !== 'quiz') return;
        if (elements.paletteOverlay && elements.paletteOverlay.classList.contains('active')) return;

        const currentQ = state.currentQuiz.questions[state.currentQuiz.currentIndex];
        if (!currentQ) return;

        const answerRecord = state.currentQuiz.userAnswers[state.currentQuiz.currentIndex];

        // 1, 2, 3, 4 or A, B, C, D to pick option
        const key = e.key.toUpperCase();
        const optionKeys = Object.keys(currentQ.options_en);
        let selectedOption = null;

        if (key === '1' && optionKeys[0]) selectedOption = optionKeys[0];
        else if (key === '2' && optionKeys[1]) selectedOption = optionKeys[1];
        else if (key === '3' && optionKeys[2]) selectedOption = optionKeys[2];
        else if (key === '4' && optionKeys[3]) selectedOption = optionKeys[3];
        else if (key === '5' && optionKeys[4]) selectedOption = optionKeys[4];
        else if (optionKeys.includes(key)) selectedOption = key;

        if (selectedOption && !answerRecord) {
            handleOptionSelect(selectedOption);
            return;
        }

        // Enter or ArrowRight or Space to go to next question (if already answered)
        if (e.key === 'ArrowRight' || (answerRecord && (e.key === 'Enter' || e.key === ' '))) {
            if (state.currentQuiz.currentIndex < state.currentQuiz.questions.length - 1) {
                e.preventDefault();
                nextQuestion();
            } else if (answerRecord && e.key === 'Enter') {
                finishQuiz();
            }
        } else if (e.key === 'ArrowLeft') {
            if (state.currentQuiz.currentIndex > 0) {
                e.preventDefault();
                prevQuestion();
            }
        } else if (key === 'T') {
            e.preventDefault();
            state.questionLang = state.questionLang === 'es' ? 'en' : 'es';
            renderCurrentQuestion();
        } else if (key === 'B' || key === 'M') {
            e.preventDefault();
            if (elements.btnQuestionBookmark) elements.btnQuestionBookmark.click();
        }
    }

    /**
     * Translation Helper
     */
    function t(key) {
        return UI_STRINGS[state.lang][key] || UI_STRINGS['es'][key] || key;
    }

    /**
     * Render Global Header & Language Strings
     */
    function renderGlobalUI() {
        if (elements.globalLangText) elements.globalLangText.textContent = t('langButton');
        const brandTagEl = document.getElementById('brand-tag');
        if (brandTagEl) brandTagEl.textContent = t('brandTag');
        
        const setElText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        const hasAllActive = window.appStorage.hasActiveSession('all');
        const allBtnText = hasAllActive ? t('heroContinueAll') : t('heroStartAll');

        setElText('dash-hero-title', t('heroTitle'));
        setElText('dash-hero-subtitle', t('heroSubtitle'));
        setElText('btn-hero-start-text', allBtnText);
        setElText('btn-hero-exam-text', t('heroExam'));
        setElText('lbl-score-title', t('scoreLabel'));
        setElText('lbl-metric-answered', t('metricAnswered'));
        setElText('lbl-metric-accuracy', t('metricAccuracy'));
        setElText('lbl-metric-failed', t('metricFailed'));
        setElText('lbl-metric-mastered', t('metricMastered'));
        setElText('title-quick-modes', t('quickModesTitle'));
        setElText('title-modules-sec', t('modulesTitle'));

        setElText('mode-exam-title', t('modeExamTitle'));
        setElText('mode-exam-desc', t('modeExamDesc'));
        setElText('mode-failed-title', t('modeFailedTitle'));
        setElText('mode-failed-desc', t('modeFailedDesc'));
        setElText('mode-quick-title', t('modeQuickTitle'));
        setElText('mode-quick-desc', t('modeQuickDesc'));
        setElText('mode-bookmarks-title', t('modeBookmarksTitle'));
        setElText('mode-bookmarks-desc', t('modeBookmarksDesc'));

        setElText('res-lbl-correct', t('correctStat'));
        setElText('res-lbl-incorrect', t('incorrectStat'));
        setElText('res-lbl-accuracy', t('accuracyStat'));
        setElText('res-lbl-time', t('timeStat'));
        
        if (elements.btnRepeatFailed) elements.btnRepeatFailed.textContent = t('btnRepeatFailedOnly');
        if (elements.btnRestartQuiz) elements.btnRestartQuiz.textContent = t('btnRestartCurrent');
        if (elements.btnResultsDashboard) elements.btnResultsDashboard.textContent = t('btnReturnHome');
        if (elements.tabFilterAll) elements.tabFilterAll.textContent = t('filterAll');
        if (elements.tabFilterFailed) elements.tabFilterFailed.textContent = t('filterFailed');
        if (elements.tabFilterCorrect) elements.tabFilterCorrect.textContent = t('filterCorrect');
        if (elements.btnPrevQuestion) elements.btnPrevQuestion.textContent = t('btnPrev');
        if (elements.btnNextQuestion) elements.btnNextQuestion.textContent = t('btnNext');
        if (elements.btnFinishQuiz) elements.btnFinishQuiz.textContent = t('btnFinish');
    }

    /**
     * Switch Active View
     */
    function switchView(viewName) {
        state.currentView = viewName;
        if (elements.viewDashboard) elements.viewDashboard.classList.remove('active');
        if (elements.viewQuiz) elements.viewQuiz.classList.remove('active');
        if (elements.viewResults) elements.viewResults.classList.remove('active');

        if (viewName === 'dashboard') {
            stopQuizTimer();
            renderDashboard();
            if (elements.viewDashboard) elements.viewDashboard.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (viewName === 'quiz') {
            if (elements.viewQuiz) elements.viewQuiz.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (viewName === 'results') {
            stopQuizTimer();
            renderResultsView();
            if (elements.viewResults) elements.viewResults.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Render Dashboard
     */
    function renderDashboard() {
        const stats = window.appStorage.getGlobalStats();

        // Scaled Score Display (100 - 1000)
        if (elements.statScaledScore) elements.statScaledScore.textContent = stats.scaledScore;
        if (elements.statScoreStatus) {
            if (stats.totalAnswered === 0) {
                elements.statScoreStatus.textContent = '—';
                elements.statScoreStatus.className = 'score-status';
            } else if (stats.passed) {
                elements.statScoreStatus.textContent = t('scorePassed');
                elements.statScoreStatus.className = 'score-status pass';
            } else {
                elements.statScoreStatus.textContent = t('scoreFailed');
                elements.statScoreStatus.className = 'score-status fail';
            }
        }

        // Metrics
        if (elements.statTotalAnswered) elements.statTotalAnswered.textContent = `${stats.totalAnswered} / ${stats.totalQuestions}`;
        if (elements.statAccuracy) elements.statAccuracy.textContent = `${stats.accuracy}%`;
        if (elements.statFailedPending) elements.statFailedPending.textContent = stats.failedPendingCount;
        if (elements.statMastered) elements.statMastered.textContent = stats.masteredCount;

        // Render Modules Grid
        renderModulesGrid();
    }

    /**
     * Render Modules Grid (9 modules)
     */
    function renderModulesGrid() {
        if (!elements.modulesGrid) return;
        elements.modulesGrid.innerHTML = '';
        const modules = window.AWS_EXAM_DATA.modules;

        modules.forEach(mod => {
            const modStats = window.appStorage.progress.moduleStats[mod.id] || {
                total: mod.questionCount,
                answered: 0,
                correct: 0,
                accuracy: 0,
                completion: 0
            };

            const sessionKey = 'module_' + mod.id;
            const activeSession = window.appStorage.getActiveSession(sessionKey);
            const hasActiveSession = !!activeSession;

            const title = state.lang === 'es' ? mod.title_es : mod.title_en;
            const desc = state.lang === 'es' ? mod.desc_es : mod.desc_en;

            let actionText = t('btnStartTest');
            if (hasActiveSession) {
                const curQNum = (activeSession.currentIndex || 0) + 1;
                actionText = `${t('btnContinueTest')} (Pregunta ${curQNum}/${mod.questionCount})`;
            }

            const card = document.createElement('div');
            card.className = 'module-card';
            card.innerHTML = `
                <div class="module-card-top">
                    <div class="mod-icon-wrapper">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                    </div>
                    <span class="mod-number-badge">Mod ${mod.code}</span>
                </div>
                <h4>${title}</h4>
                <p>${desc}</p>
                <div class="mod-progress-container">
                    <div class="mod-progress-header">
                        <span>${modStats.answered} / ${mod.questionCount} ${t('questionsWord')} (${modStats.completion}%)</span>
                        <span>${modStats.accuracy}% precisión</span>
                    </div>
                    <div class="mod-progress-bar-bg">
                        <div class="mod-progress-bar-fill" style="width: ${modStats.completion}%;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn-start-module" data-modid="${mod.id}" style="flex: 1;">
                        <span>${actionText}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    ${hasActiveSession ? `
                        <button class="btn-restart-single-mod" data-modid="${mod.id}" title="Reiniciar y barajar de nuevo este módulo" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-secondary); padding: 0.7rem 0.85rem; border-radius: var(--radius-md); cursor: pointer; font-size: 0.8rem; font-weight: 600; flex-shrink: 0;">
                            ${t('btnRestartModule')}
                        </button>
                    ` : ''}
                </div>
            `;

            // Clicking anywhere on the card continues/starts the module test
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-restart-single-mod')) {
                    e.stopPropagation();
                    startModuleTest(mod.id, true); // Force restart with new randomized order
                    return;
                }
                startModuleTest(mod.id, false); // Resume or start
            });

            elements.modulesGrid.appendChild(card);
        });
    }

    /**
     * Start All Questions Test (676 questions randomized)
     */
    function startAllQuestionsMode(forceRestart = false) {
        const sessionKey = 'all';
        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            // Restore saved session with exact randomized order and user answers
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Modo Completo: Todas las Preguntas (676 Qs)',
                title_en: 'Full Bank: All Questions (676 Qs)',
                mode: 'all',
                moduleId: null,
                questions: restoredQuestions,
                currentIndex: savedSession.currentIndex || 0,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            // New randomized run
            const allQuestions = [...window.AWS_EXAM_DATA.questions];
            shuffleArray(allQuestions);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Modo Completo: Todas las Preguntas (676 Qs - Aleatorio)',
                title_en: 'Full Bank: All Questions (676 Qs - Randomized)',
                mode: 'all',
                moduleId: null,
                questions: allQuestions,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Start Module Test (Randomized Question Order & Session Resumption)
     */
    function startModuleTest(moduleId, forceRestart = false) {
        const modObj = window.AWS_EXAM_DATA.modules.find(m => m.id === moduleId);
        if (!modObj) return;

        const sessionKey = 'module_' + moduleId;
        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            // Resume ongoing test session with exact questions order & answers
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            // Find either the saved index or the first unanswered question
            let targetIndex = savedSession.currentIndex || 0;
            if (targetIndex >= restoredQuestions.length) {
                targetIndex = 0;
            }

            initQuizSession({
                sessionKey: sessionKey,
                title_es: modObj.title_es,
                title_en: modObj.title_en,
                mode: 'module',
                moduleId: moduleId,
                questions: restoredQuestions,
                currentIndex: targetIndex,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            // Start fresh test with randomized questions order
            const questions = window.AWS_EXAM_DATA.questions.filter(q => q.moduleId === moduleId);
            shuffleArray(questions); // Randomize question order!

            initQuizSession({
                sessionKey: sessionKey,
                title_es: modObj.title_es,
                title_en: modObj.title_en,
                mode: 'module',
                moduleId: moduleId,
                questions: questions,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Quick Mode: Full Exam Simulation (65 randomized questions)
     */
    function startExamMode(forceRestart = false) {
        const sessionKey = 'exam';
        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Simulacro de Examen Oficial SAA-C03 (65 preguntas)',
                title_en: 'Official SAA-C03 Exam Simulation (65 questions)',
                mode: 'exam',
                moduleId: null,
                questions: restoredQuestions,
                currentIndex: savedSession.currentIndex || 0,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            const allQuestions = [...window.AWS_EXAM_DATA.questions];
            shuffleArray(allQuestions);
            const selected = allQuestions.slice(0, Math.min(65, allQuestions.length));

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Simulacro de Examen Oficial SAA-C03 (65 preguntas)',
                title_en: 'Official SAA-C03 Exam Simulation (65 questions)',
                mode: 'exam',
                moduleId: null,
                questions: selected,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Quick Mode: Practice 20
     */
    function startQuickMode(forceRestart = false) {
        const sessionKey = 'quick';
        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Práctica Rápida (20 preguntas)',
                title_en: 'Quick Practice (20 questions)',
                mode: 'quick',
                moduleId: null,
                questions: restoredQuestions,
                currentIndex: savedSession.currentIndex || 0,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            const allQuestions = [...window.AWS_EXAM_DATA.questions];
            shuffleArray(allQuestions);
            const selected = allQuestions.slice(0, Math.min(20, allQuestions.length));

            initQuizSession({
                sessionKey: sessionKey,
                title_es: 'Práctica Rápida (20 preguntas)',
                title_en: 'Quick Practice (20 questions)',
                mode: 'quick',
                moduleId: null,
                questions: selected,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Quick Mode: Failed Questions Review
     */
    function startFailedMode(forceRestart = false) {
        const sessionKey = 'failed';
        const failed = window.appStorage.getFailedQuestions();
        if (failed.length === 0) {
            showToast(t('noFailedQuestions'));
            return;
        }

        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: `Repaso de Fallos (${restoredQuestions.length} preguntas)`,
                title_en: `Failed Questions Review (${restoredQuestions.length} questions)`,
                mode: 'failed',
                moduleId: null,
                questions: restoredQuestions,
                currentIndex: savedSession.currentIndex || 0,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            shuffleArray(failed);
            initQuizSession({
                sessionKey: sessionKey,
                title_es: `Repaso de Fallos (${failed.length} preguntas)`,
                title_en: `Failed Questions Review (${failed.length} questions)`,
                mode: 'failed',
                moduleId: null,
                questions: failed,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Quick Mode: Bookmarked Questions Review
     */
    function startBookmarksMode(forceRestart = false) {
        const sessionKey = 'bookmarked';
        const bookmarks = window.appStorage.getBookmarkedQuestions();
        if (bookmarks.length === 0) {
            showToast(t('noBookmarkedQuestions'));
            return;
        }

        const savedSession = !forceRestart ? window.appStorage.getActiveSession(sessionKey) : null;

        if (savedSession && savedSession.questionIds && savedSession.questionIds.length > 0) {
            const qMap = new Map(window.AWS_EXAM_DATA.questions.map(q => [q.id, q]));
            const restoredQuestions = savedSession.questionIds.map(id => qMap.get(id)).filter(Boolean);

            initQuizSession({
                sessionKey: sessionKey,
                title_es: `Preguntas Guardadas (${restoredQuestions.length} preguntas)`,
                title_en: `Bookmarked Questions (${restoredQuestions.length} questions)`,
                mode: 'bookmarked',
                moduleId: null,
                questions: restoredQuestions,
                currentIndex: savedSession.currentIndex || 0,
                userAnswers: savedSession.userAnswers || {},
                timeElapsedSeconds: savedSession.timeElapsedSeconds || 0
            });
        } else {
            shuffleArray(bookmarks);
            initQuizSession({
                sessionKey: sessionKey,
                title_es: `Preguntas Guardadas (${bookmarks.length} preguntas)`,
                title_en: `Bookmarked Questions (${bookmarks.length} questions)`,
                mode: 'bookmarked',
                moduleId: null,
                questions: bookmarks,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Initialize Quiz Session State
     */
    function initQuizSession(config) {
        state.currentQuiz = {
            sessionKey: config.sessionKey || ('module_' + config.moduleId),
            title_es: config.title_es,
            title_en: config.title_en,
            mode: config.mode,
            moduleId: config.moduleId,
            questions: config.questions,
            currentIndex: config.currentIndex || 0,
            userAnswers: config.userAnswers || {},
            startTime: Date.now(),
            endTime: null,
            timeElapsedSeconds: config.timeElapsedSeconds || 0,
            timerInterval: null
        };

        state.questionLang = state.lang;
        syncCurrentQuizSessionToStorage();
        startQuizTimer();
        switchView('quiz');
        renderCurrentQuestion();
    }

    /**
     * Synchronize Active Quiz Session to LocalStorage
     */
    function syncCurrentQuizSessionToStorage() {
        const quiz = state.currentQuiz;
        if (!quiz || !quiz.sessionKey || !quiz.questions || quiz.questions.length === 0) return;

        const sessionData = {
            sessionKey: quiz.sessionKey,
            mode: quiz.mode,
            moduleId: quiz.moduleId,
            title_es: quiz.title_es,
            title_en: quiz.title_en,
            questionIds: quiz.questions.map(q => q.id),
            currentIndex: quiz.currentIndex,
            userAnswers: quiz.userAnswers,
            timeElapsedSeconds: quiz.timeElapsedSeconds
        };

        window.appStorage.saveActiveSession(quiz.sessionKey, sessionData);
    }

    /**
     * Start Timer for Active Test
     */
    function startQuizTimer() {
        stopQuizTimer();
        updateTimerDisplay();

        state.currentQuiz.timerInterval = setInterval(() => {
            state.currentQuiz.timeElapsedSeconds++;
            updateTimerDisplay();
            // Periodically sync time every 5 seconds
            if (state.currentQuiz.timeElapsedSeconds % 5 === 0) {
                syncCurrentQuizSessionToStorage();
            }
        }, 1000);
    }

    function stopQuizTimer() {
        if (state.currentQuiz.timerInterval) {
            clearInterval(state.currentQuiz.timerInterval);
            state.currentQuiz.timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        if (!elements.quizTimerText) return;
        const totalSecs = state.currentQuiz.timeElapsedSeconds;
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        elements.quizTimerText.textContent = `⏱️ ${str}`;
    }

    /**
     * Render the Current Question
     */
    function renderCurrentQuestion() {
        const quiz = state.currentQuiz;
        const q = quiz.questions[quiz.currentIndex];
        if (!q) return;

        // Header Title & Progress
        const quizTitle = state.lang === 'es' ? quiz.title_es : quiz.title_en;
        if (elements.quizModuleTitle) elements.quizModuleTitle.textContent = quizTitle;
        if (elements.quizProgressText) elements.quizProgressText.textContent = `${quiz.currentIndex + 1} / ${quiz.questions.length}`;

        const progressPercent = Math.round(((quiz.currentIndex + 1) / quiz.questions.length) * 100);
        if (elements.quizProgressBar) elements.quizProgressBar.style.width = `${progressPercent}%`;

        // Translation Button Label
        const isCurrentlySpanish = (state.questionLang === 'es');
        if (elements.questionTranslateText) {
            elements.questionTranslateText.textContent = isCurrentlySpanish ? t('translateBtn') : t('translateBtnBack');
        }

        // Bookmark Active State
        const isBookmarked = window.appStorage.isBookmarked(q.id);
        if (elements.btnQuestionBookmark) {
            elements.btnQuestionBookmark.classList.toggle('active', isBookmarked);
        }

        // Question Statement
        const scenarioTitle = isCurrentlySpanish ? q.scenarioTitle_es : q.scenarioTitle_en;
        const questionText = isCurrentlySpanish ? q.question_es : q.question_en;

        if (elements.scenarioBadge) elements.scenarioBadge.textContent = `Scenario ${q.scenarioNumber}: ${scenarioTitle}`;
        if (elements.questionTitle) elements.questionTitle.textContent = questionText;

        // Render Options
        const optionsMap = isCurrentlySpanish ? q.options_es : q.options_en;
        if (elements.optionsContainer) {
            elements.optionsContainer.innerHTML = '';
            const answerRecord = quiz.userAnswers[quiz.currentIndex];

            for (const [letter, text] of Object.entries(optionsMap)) {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.dataset.letter = letter;

                const isCorrectOption = (letter === q.answer);
                const isUserSelected = (answerRecord && answerRecord.selected === letter);

                if (answerRecord) {
                    btn.disabled = true;
                    if (isCorrectOption) {
                        btn.classList.add('correct');
                    } else if (isUserSelected && !answerRecord.isCorrect) {
                        btn.classList.add('incorrect');
                    } else {
                        btn.classList.add('dimmed');
                    }
                }

                btn.innerHTML = `
                    <div class="option-letter">${letter}</div>
                    <div class="option-text-content">${text}</div>
                    <div class="option-feedback-icon">
                        ${isCorrectOption ? '✓' : (isUserSelected ? '✗' : '')}
                    </div>
                `;

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!quiz.userAnswers[quiz.currentIndex]) {
                        handleOptionSelect(letter);
                    }
                });

                elements.optionsContainer.appendChild(btn);
            }
        }

        // Render Explanation (if already answered)
        const answerRecord = quiz.userAnswers[quiz.currentIndex];
        if (elements.explanationBox) {
            if (answerRecord) {
                const explanation = isCurrentlySpanish ? q.explanation_es : q.explanation_en;
                elements.explanationBox.className = 'explanation-card show' + (answerRecord.isCorrect ? '' : ' failed-header');
                if (elements.explanationTitle) elements.explanationTitle.textContent = answerRecord.isCorrect ? t('whyCorrectTitle') : t('whyFailedTitle');
                if (elements.explanationText) elements.explanationText.textContent = explanation;
            } else {
                elements.explanationBox.className = 'explanation-card';
                if (elements.explanationText) elements.explanationText.textContent = '';
            }
        }

        // Navigation Button states
        if (elements.btnPrevQuestion) elements.btnPrevQuestion.disabled = (quiz.currentIndex === 0);

        if (quiz.currentIndex === quiz.questions.length - 1) {
            if (elements.btnNextQuestion) elements.btnNextQuestion.style.display = 'none';
            if (elements.btnFinishQuiz) elements.btnFinishQuiz.style.display = 'flex';
        } else {
            if (elements.btnNextQuestion) elements.btnNextQuestion.style.display = 'flex';
            if (elements.btnFinishQuiz) elements.btnFinishQuiz.style.display = 'none';
        }
    }

    /**
     * Handle User Selection of an Option
     */
    function handleOptionSelect(selectedLetter) {
        const quiz = state.currentQuiz;
        const q = quiz.questions[quiz.currentIndex];
        if (!q || quiz.userAnswers[quiz.currentIndex]) return;

        const isCorrect = (selectedLetter === q.answer);

        // Record locally in quiz state
        quiz.userAnswers[quiz.currentIndex] = {
            selected: selectedLetter,
            isCorrect: isCorrect,
            questionId: q.id
        };

        // Persist to global storage
        window.appStorage.recordAnswer(q, selectedLetter, isCorrect);

        // Persist active session state
        syncCurrentQuizSessionToStorage();

        // Update current question UI instantly (shows green/red + explanation)
        renderCurrentQuestion();

        // Render palette background if open
        renderPalette();
    }

    /**
     * Next / Prev Question Handlers
     */
    function nextQuestion() {
        if (state.currentQuiz.currentIndex < state.currentQuiz.questions.length - 1) {
            state.currentQuiz.currentIndex++;
            state.questionLang = state.lang;
            syncCurrentQuizSessionToStorage();
            renderCurrentQuestion();
            window.scrollTo({ top: 120, behavior: 'smooth' });
        }
    }

    function prevQuestion() {
        if (state.currentQuiz.currentIndex > 0) {
            state.currentQuiz.currentIndex--;
            state.questionLang = state.lang;
            syncCurrentQuizSessionToStorage();
            renderCurrentQuestion();
            window.scrollTo({ top: 120, behavior: 'smooth' });
        }
    }

    /**
     * Question Palette / Matrix Modal
     */
    function renderPalette() {
        if (!elements.paletteGrid) return;
        elements.paletteGrid.innerHTML = '';
        const quiz = state.currentQuiz;

        quiz.questions.forEach((q, idx) => {
            const btn = document.createElement('button');
            btn.className = 'palette-num-btn';
            btn.textContent = idx + 1;

            if (idx === quiz.currentIndex) {
                btn.classList.add('current');
            }

            const answerRecord = quiz.userAnswers[idx];
            if (answerRecord) {
                if (answerRecord.isCorrect) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                }
            }

            if (window.appStorage.isBookmarked(q.id)) {
                btn.classList.add('bookmarked');
            }

            btn.addEventListener('click', () => {
                quiz.currentIndex = idx;
                state.questionLang = state.lang;
                syncCurrentQuizSessionToStorage();
                renderCurrentQuestion();
                if (elements.paletteOverlay) elements.paletteOverlay.classList.remove('active');
            });

            elements.paletteGrid.appendChild(btn);
        });
    }

    /**
     * Finish Quiz & Calculate Results
     */
    function finishQuiz() {
        stopQuizTimer();
        state.currentQuiz.endTime = Date.now();

        // Clear active session upon completion so the next run starts fresh
        if (state.currentQuiz.sessionKey) {
            window.appStorage.clearActiveSession(state.currentQuiz.sessionKey);
        }

        // Calculate stats
        const total = state.currentQuiz.questions.length;
        let correct = 0;

        for (let i = 0; i < total; i++) {
            const ans = state.currentQuiz.userAnswers[i];
            if (ans && ans.isCorrect) {
                correct++;
            }
        }

        const incorrect = total - correct;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const scaledScore = Math.min(1000, Math.round(100 + (accuracy / 100) * 900));
        const passed = scaledScore >= 720;

        // Save to test history
        window.appStorage.addTestHistory({
            mode: state.currentQuiz.mode,
            title: state.lang === 'es' ? state.currentQuiz.title_es : state.currentQuiz.title_en,
            total: total,
            correct: correct,
            incorrect: incorrect,
            accuracy: accuracy,
            scaledScore: scaledScore,
            passed: passed,
            durationSeconds: state.currentQuiz.timeElapsedSeconds
        });

        // Switch to Results
        switchView('results');
    }

    /**
     * Render Results View
     */
    function renderResultsView() {
        const quiz = state.currentQuiz;
        const total = quiz.questions.length;
        let correct = 0;

        for (let i = 0; i < total; i++) {
            const ans = quiz.userAnswers[i];
            if (ans && ans.isCorrect) correct++;
        }

        const incorrect = total - correct;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const scaledScore = Math.min(1000, Math.round(100 + (accuracy / 100) * 900));
        const passed = scaledScore >= 720;

        // Score & Status
        if (elements.resultsScoreNum) elements.resultsScoreNum.textContent = scaledScore;
        if (elements.resultsStatusBadge) {
            if (passed) {
                elements.resultsStatusBadge.textContent = t('scorePassed');
                elements.resultsStatusBadge.className = 'results-badge-status pass';
            } else {
                elements.resultsStatusBadge.textContent = t('scoreFailed');
                elements.resultsStatusBadge.className = 'results-badge-status fail';
            }
        }

        if (elements.resultsSubtitle) elements.resultsSubtitle.textContent = state.lang === 'es' ? quiz.title_es : quiz.title_en;
        if (elements.resCorrectVal) elements.resCorrectVal.textContent = correct;
        if (elements.resIncorrectVal) elements.resIncorrectVal.textContent = incorrect;
        if (elements.resAccuracyVal) elements.resAccuracyVal.textContent = `${accuracy}%`;

        const mins = Math.floor(quiz.timeElapsedSeconds / 60);
        const secs = quiz.timeElapsedSeconds % 60;
        if (elements.resTimeVal) elements.resTimeVal.textContent = `${mins}m ${secs}s`;

        // Repeat failed button visibility
        if (elements.btnRepeatFailed) elements.btnRepeatFailed.style.display = (incorrect > 0) ? 'inline-flex' : 'none';

        // Render Review Questions List
        renderResultsReviewList();
    }

    /**
     * Render Questions Review List in Results
     */
    function renderResultsReviewList() {
        if (!elements.resultsQuestionsList) return;
        elements.resultsQuestionsList.innerHTML = '';
        const quiz = state.currentQuiz;

        quiz.questions.forEach((q, idx) => {
            const ans = quiz.userAnswers[idx];
            const isCorrect = ans && ans.isCorrect;

            if (state.reviewFilter === 'failed' && isCorrect) return;
            if (state.reviewFilter === 'correct' && !isCorrect) return;

            const card = document.createElement('div');
            card.className = 'question-card-wrapper';
            card.style.marginBottom = '1.25rem';

            const scenarioTitle = state.lang === 'es' ? q.scenarioTitle_es : q.scenarioTitle_en;
            const questionText = state.lang === 'es' ? q.question_es : q.question_en;
            const explanation = state.lang === 'es' ? q.explanation_es : q.explanation_en;
            const options = state.lang === 'es' ? q.options_es : q.options_en;

            let optionsHtml = '';
            for (const [letter, text] of Object.entries(options)) {
                const isCorrectOpt = (letter === q.answer);
                const isSelected = (ans && ans.selected === letter);
                let optClass = 'option-btn dimmed';
                if (isCorrectOpt) optClass = 'option-btn correct';
                else if (isSelected) optClass = 'option-btn incorrect';

                optionsHtml += `
                    <div class="${optClass}" style="cursor: default;">
                        <div class="option-letter">${letter}</div>
                        <div class="option-text-content">${text}</div>
                        <div class="option-feedback-icon">${isCorrectOpt ? '✓' : (isSelected ? '✗' : '')}</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <span class="question-scenario-badge" style="margin-bottom: 0;">#${idx + 1} - ${scenarioTitle}</span>
                    <span style="font-weight: 700; font-size: 0.85rem; color: ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'};">
                        ${isCorrect ? '✓ Correcto' : '✗ Fallado'}
                    </span>
                </div>
                <h3 class="question-text-title" style="font-size: 1.1rem; margin-bottom: 1rem;">${questionText}</h3>
                <div class="options-list" style="margin-bottom: 1rem;">${optionsHtml}</div>
                <div class="explanation-card show ${isCorrect ? '' : 'failed-header'}" style="margin-top: 0;">
                    <div class="explanation-title">${t('whyCorrectTitle')}</div>
                    <div class="explanation-text">${explanation}</div>
                </div>
            `;

            elements.resultsQuestionsList.appendChild(card);
        });
    }

    /**
     * Filter results review
     */
    function setReviewFilter(filter) {
        state.reviewFilter = filter;
        if (elements.tabFilterAll) elements.tabFilterAll.classList.toggle('active', filter === 'all');
        if (elements.tabFilterFailed) elements.tabFilterFailed.classList.toggle('active', filter === 'failed');
        if (elements.tabFilterCorrect) elements.tabFilterCorrect.classList.toggle('active', filter === 'correct');
        renderResultsReviewList();
    }

    /**
     * Repeat only Failed Questions from the current test
     */
    function repeatFailedFromCurrentQuiz() {
        const quiz = state.currentQuiz;
        const failedQuestions = [];

        quiz.questions.forEach((q, idx) => {
            const ans = quiz.userAnswers[idx];
            if (!ans || !ans.isCorrect) {
                failedQuestions.push(q);
            }
        });

        if (failedQuestions.length === 0) {
            showToast(t('noFailedQuestions'));
            return;
        }

        shuffleArray(failedQuestions);
        initQuizSession({
            sessionKey: 'failed_retry_' + Date.now(),
            title_es: `Repaso de Fallos (${failedQuestions.length} preguntas)`,
            title_en: `Failed Questions Retry (${failedQuestions.length} questions)`,
            mode: 'failed',
            moduleId: quiz.moduleId,
            questions: failedQuestions,
            currentIndex: 0,
            userAnswers: {},
            timeElapsedSeconds: 0
        });
    }

    /**
     * Restart current quiz with fresh randomized questions
     */
    function restartCurrentQuiz() {
        if (state.currentQuiz.moduleId) {
            startModuleTest(state.currentQuiz.moduleId, true);
        } else if (state.currentQuiz.mode === 'all') {
            startAllQuestionsMode(true);
        } else if (state.currentQuiz.mode === 'exam') {
            startExamMode(true);
        } else if (state.currentQuiz.mode === 'quick') {
            startQuickMode(true);
        } else {
            const questions = [...state.currentQuiz.questions];
            shuffleArray(questions);
            initQuizSession({
                sessionKey: state.currentQuiz.sessionKey,
                title_es: state.currentQuiz.title_es,
                title_en: state.currentQuiz.title_en,
                mode: state.currentQuiz.mode,
                moduleId: state.currentQuiz.moduleId,
                questions: questions,
                currentIndex: 0,
                userAnswers: {},
                timeElapsedSeconds: 0
            });
        }
    }

    /**
     * Helper: Toast notifications
     */
    function showToast(message) {
        if (!elements.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>${message}</span>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2800);
    }

    /**
     * Helper: Fisher-Yates array shuffle (True randomization)
     */
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // Launch app once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
