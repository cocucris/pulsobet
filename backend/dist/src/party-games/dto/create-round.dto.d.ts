export declare class CreatePartyRoundDto {
    sessionId: string;
    gameType: 'BLUFFING' | 'TUTI_FRUTI' | 'SOCIAL_JUDGMENT';
    prompt: string;
    categories?: string[];
    realAnswer?: string;
    timeLimit?: number;
}
