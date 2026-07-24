export declare class SportsApiWebhookDto {
    fixtureId: number;
    event: 'GOAL' | 'CARD' | 'PERIOD_END' | 'MATCH_END';
    details: {
        team: 'HOME' | 'AWAY';
        player?: string;
        minute: number;
        extraDetail?: string;
    };
}
