import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto, DatePreset } from './dto/analytics-query.dto';
export declare class BarService {
    private prisma;
    constructor(prisma: PrismaService);
    claimRewardInstant(playerId: string, rewardId: string): Promise<{
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
        playerId: string;
        rewardId: string;
        claimCode: string;
        isRedeemed: boolean;
    }>;
    redeemRewardCode(barId: string, claimCode: string): Promise<{
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
        playerId: string;
        rewardId: string;
        claimCode: string;
        isRedeemed: boolean;
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
            playerId: string;
            rewardId: string;
            claimCode: string;
            isRedeemed: boolean;
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
            playerId: string;
            rewardId: string;
            claimCode: string;
            isRedeemed: boolean;
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
