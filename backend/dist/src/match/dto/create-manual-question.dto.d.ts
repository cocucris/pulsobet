export declare class CreateManualQuestionDto {
    barId: string;
    questionText: string;
    options: Array<{
        id: number;
        text: string;
    }>;
    expiresInSeconds: number;
    pointsReward?: number;
    imageUrl?: string;
    isFlash?: boolean;
}
