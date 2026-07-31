"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Poblando base de datos con datos de prueba...');
    const bar = await prisma.bar.upsert({
        where: { slug: 'kilkenny' },
        update: {},
        create: {
            id: 'local-kilkenny-test',
            name: 'Kilkenny Irish Pub',
            slug: 'kilkenny',
            address: 'Paseo Carmelitas, Asunción',
        },
    });
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@kilkenny.com.py' },
        update: {},
        create: {
            email: 'admin@kilkenny.com.py',
            password: hashedPassword,
            role: client_1.Role.BAR_STAFF,
            barId: bar.id,
        },
    });
    const session = await prisma.gameSession.upsert({
        where: { id: 'session-demo-01' },
        update: { isActive: true },
        create: {
            id: 'session-demo-01',
            barId: bar.id,
            isActive: true,
        },
    });
    await prisma.match.upsert({
        where: { apiFootballId: 9999 },
        update: {},
        create: {
            apiFootballId: 9999,
            homeTeam: 'Olimpia',
            awayTeam: 'Cerro Porteño',
            startTime: new Date(),
            status: client_1.MatchStatus.SCHEDULED,
            scoreHome: 0,
            scoreAway: 0,
        },
    });
    await prisma.reward.createMany({
        data: [
            { barId: bar.id, title: 'Pinta de Cerveza Gratis', pointsCost: 300, stock: 50 },
            { barId: bar.id, title: 'Porción de Papas Fritas', pointsCost: 500, stock: 20 },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Base de datos poblada exitosamente.');
    console.log('🔑 Credenciales de Staff: admin@kilkenny.com.py / admin123');
    console.log('📱 ID de Sesión Móvil/TV: session-demo-01');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map