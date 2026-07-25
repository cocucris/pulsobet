export declare class UpdateMatchScoreDto {
    matchId: string;
    scoreHome: number;
    scoreAway: number;
    homeTeam?: string;
    awayTeam?: string;
    currentMinute?: number;
    status?: string;
}
