export declare class CreateCardDto {
    sessionId: string;
    playerId?: string;
    tableNumber?: string;
    name: string;
    age?: number;
    position?: string;
    strongFoot?: string;
    fitness?: number;
    skills: {
        key: string;
        label: string;
        icon: string;
        stars: number;
    }[];
    objective?: string;
    photoUrl?: string;
}
