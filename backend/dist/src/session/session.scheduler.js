"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SessionScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionScheduler = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SessionScheduler = SessionScheduler_1 = class SessionScheduler {
    prisma;
    logger = new common_1.Logger(SessionScheduler_1.name);
    activeTimers = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        this.logger.log('Inicializando SessionScheduler y recuperando trivias activas...');
        try {
            const activeQuestions = await this.prisma.liveQuestion.findMany({
                where: {
                    correctOptionId: null,
                    isClosed: false,
                },
                include: {
                    match: true,
                },
            });
            for (const question of activeQuestions) {
                const remainingMs = new Date(question.expiresAt).getTime() - Date.now();
                if (remainingMs > 0) {
                    this.logger.log(`Reactivando timer para trivia ${question.id} (tiempo restante: ${Math.round(remainingMs / 1000)}s)`);
                }
            }
        }
        catch (err) {
            this.logger.error('Error al recuperar trivias activas en scheduler:', err);
        }
    }
    scheduleAutoClose(questionId, delayMs, onCloseCallback) {
        this.cancelTimer(questionId);
        const timer = setTimeout(async () => {
            this.logger.log(`Timer expirado para trivia ${questionId}. Ejecutando auto-close...`);
            try {
                await onCloseCallback();
            }
            catch (err) {
                this.logger.error(`Error durante auto-close de trivia ${questionId}:`, err);
            }
            finally {
                this.activeTimers.delete(questionId);
            }
        }, delayMs);
        this.activeTimers.set(questionId, timer);
    }
    cancelTimer(questionId) {
        const existing = this.activeTimers.get(questionId);
        if (existing) {
            clearTimeout(existing);
            this.activeTimers.delete(questionId);
        }
    }
};
exports.SessionScheduler = SessionScheduler;
exports.SessionScheduler = SessionScheduler = SessionScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionScheduler);
//# sourceMappingURL=session.scheduler.js.map