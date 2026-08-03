import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import { AnalyticsQueryDto, DatePreset } from './dto/analytics-query.dto';
export declare class BarService {
    private prisma;
    private eventEmitter;
    private sessionCache;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, sessionCache: RedisSessionCacheService);
    claimRewardInstant(playerId: string, rewardId: string): Promise<{
        player: {
            id: string;
            sessionId: string;
            nickname: string;
            tableNumber: string | null;
            totalPoints: number;
            streakCount: number;
        };
        reward: {
            id: string;
            barId: string;
            title: string;
            pointsCost: number;
            isInstant: boolean;
            stock: number;
        };
    } & {
        id: string;
        createdAt: Date;
        claimCode: string;
        isRedeemed: boolean;
        playerId: string;
        rewardId: string;
    }>;
    redeemRewardCode(barId: string, claimCode: string): Promise<{
        player: {
            session: {
                id: string;
                barId: string;
                matchId: string | null;
                status: import("@prisma/client").$Enums.SessionStatus;
                date: Date;
                isActive: boolean;
            };
        } & {
            id: string;
            sessionId: string;
            nickname: string;
            tableNumber: string | null;
            totalPoints: number;
            streakCount: number;
        };
        reward: {
            id: string;
            barId: string;
            title: string;
            pointsCost: number;
            isInstant: boolean;
            stock: number;
        };
    } & {
        id: string;
        createdAt: Date;
        claimCode: string;
        isRedeemed: boolean;
        playerId: string;
        rewardId: string;
    }>;
    getAvailableRewards(sessionId: string): Promise<{
        id: string;
        barId: string;
        title: string;
        pointsCost: number;
        isInstant: boolean;
        stock: number;
    }[]>;
    getPlayerByNickname(sessionId: string, nickname: string): Promise<{
        claims: ({
            reward: {
                id: string;
                barId: string;
                title: string;
                pointsCost: number;
                isInstant: boolean;
                stock: number;
            };
        } & {
            id: string;
            createdAt: Date;
            claimCode: string;
            isRedeemed: boolean;
            playerId: string;
            rewardId: string;
        })[];
    } & {
        id: string;
        sessionId: string;
        nickname: string;
        tableNumber: string | null;
        totalPoints: number;
        streakCount: number;
    }>;
    getPlayerProfile(playerId: string): Promise<{
        session: {
            isActive: boolean;
        };
        claims: ({
            reward: {
                id: string;
                barId: string;
                title: string;
                pointsCost: number;
                isInstant: boolean;
                stock: number;
            };
        } & {
            id: string;
            createdAt: Date;
            claimCode: string;
            isRedeemed: boolean;
            playerId: string;
            rewardId: string;
        })[];
    } & {
        id: string;
        sessionId: string;
        nickname: string;
        tableNumber: string | null;
        totalPoints: number;
        streakCount: number;
    }>;
    private getDateRange;
    getBarAnalytics(barId: string, dto: AnalyticsQueryDto): Promise<{
        period: {
            start: Date;
            end: Date;
            preset: DatePreset;
        };
        metrics: {
            totalClaimsRedeemed: number;
            totalActivePlayers: number;
            topRewards: {
                rewardTitle: string;
                totalRedeemed: number;
            }[];
        };
    }>;
    exportClaimsReport(barId: string, dto: AnalyticsQueryDto): Promise<string>;
}
