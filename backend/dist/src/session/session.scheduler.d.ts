import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class SessionScheduler implements OnModuleInit {
    private prisma;
    private readonly logger;
    private activeTimers;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    scheduleAutoClose(questionId: string, delayMs: number, onCloseCallback: () => Promise<void>): void;
    cancelTimer(questionId: string): void;
}
