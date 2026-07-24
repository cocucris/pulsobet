import type { Response } from 'express';
import { BarService } from './bar.service';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
export declare class BarController {
    private readonly barService;
    constructor(barService: BarService);
    getRewardsForSession(sessionId: string): Promise<{
        id: string;
        barId: string;
        title: string;
        pointsCost: number;
        isInstant: boolean;
        stock: number;
    }[]>;
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
    clientClaimReward(body: {
        playerId?: string;
        rewardId: string;
    }, req: any): Promise<{
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
    staffRedeemReward(redeemRewardDto: RedeemRewardDto, req: any): Promise<{
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
    getAnalytics(query: AnalyticsQueryDto): Promise<{
        period: {
            start: Date;
            end: Date;
            preset: import("./dto/analytics-query.dto").DatePreset;
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
    exportCsv(query: AnalyticsQueryDto, res: Response): Promise<Response<any, Record<string, any>>>;
}
