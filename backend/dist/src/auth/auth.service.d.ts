import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    loginStaff(email: string, pass: string): Promise<{
        access_token: string;
    }>;
    registerAnonymousPlayer(sessionId: string, nickname: string, tableNumber?: string): Promise<{
        player_token: string;
        player: {
            id: string;
            nickname: string;
            totalPoints: number;
        };
    }>;
}
