import { AuthService } from './auth.service';
import { LoginStaffDto } from './dto/login-staff.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    loginStaff(loginStaffDto: LoginStaffDto): Promise<{
        access_token: string;
    }>;
    registerPlayer(registerPlayerDto: RegisterPlayerDto): Promise<{
        player_token: string;
        player: {
            id: string;
            nickname: string;
            totalPoints: number;
        };
    }>;
}
