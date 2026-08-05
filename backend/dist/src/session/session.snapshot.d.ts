export interface SessionSnapshot {
    sessionId: string;
    barId: string;
    version: number;
    eventNumber: number;
    serverTime: string;
    match: {
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'FINISHED';
        currentMinute: number;
    } | null;
    activeTrivias: {
        id: string;
        questionText: string;
        options: {
            id: number;
            text: string;
            count: number;
            percentage: number;
        }[];
        pointsReward: number;
        isFlash: boolean;
        expiresAt: string;
        totalVotes: number;
        imageUrl?: string | null;
    }[];
    resolvedTrivias: {
        id: string;
        questionText: string;
        options: {
            id: number;
            text: string;
            count: number;
            percentage: number;
        }[];
        pointsReward: number;
        isFlash: boolean;
        expiresAt: string;
        totalVotes: number;
        imageUrl?: string | null;
        correctOptionId: number;
        winnersCount: number;
    }[];
    leaderboardTop10: {
        rank: number;
        id: string;
        nickname: string;
        totalPoints: number;
        streakCount: number;
    }[];
    myPlayer: {
        id: string;
        nickname: string;
        totalPoints: number;
        votedTriviaIds: string[];
    } | null;
    connectedPlayersCount: number;
    rewards: {
        id: string;
        title: string;
        pointsCost: number;
        stock: number;
    }[];
    barSettings: {
        name: string;
        slug: string;
    };
    mode: string;
    activeCards: {
        id: string;
        sessionId: string;
        tableNumber: string | null;
        name: string;
        age: number | null;
        position: string | null;
        strongFoot: string | null;
        fitness: number | null;
        skills: {
            key: string;
            label: string;
            icon: string;
            stars: number;
        }[];
        objective: string | null;
        photoUrl: string | null;
        status: string;
        createdAt: Date;
        counts: {
            interested: number;
            introduce: number;
            pass: number;
        };
        totalVotes: number;
    }[];
    cardsHistory: any[];
    pendingCardsCount: number;
    myCardVotes: Record<string, string>;
    votingClosed: boolean;
    votingResults: {
        topInterested: {
            id: string;
            name: string;
            photoUrl: string | null;
            tableNumber: string | null;
            percentage: number;
            votes: number;
            totalVotes: number;
        }[];
        topIntroduce: {
            id: string;
            name: string;
            photoUrl: string | null;
            tableNumber: string | null;
            percentage: number;
            votes: number;
            totalVotes: number;
        }[];
    } | null;
    connectionStatus: 'connected';
}
