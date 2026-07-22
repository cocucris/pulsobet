import { PrismaClient, Role, MatchStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Poblando base de datos con datos de prueba...');

  // 1. Crear el Bar de prueba
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

  // 2. Crear el usuario Staff/Gerente para el Login
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kilkenny.com.py' },
    update: {},
    create: {
      email: 'admin@kilkenny.com.py',
      password: hashedPassword,
      role: Role.BAR_STAFF,
      barId: bar.id,
    },
  });

  // 3. Crear una Sesión de Juego Activa (para la URL /play/session-demo-01)
  const session = await prisma.gameSession.upsert({
    where: { id: 'session-demo-01' },
    update: { isActive: true },
    create: {
      id: 'session-demo-01',
      barId: bar.id,
      isActive: true,
    },
  });

  // 4. Crear un Partido en Vivo de prueba (Primera División de Paraguay)
  await prisma.match.upsert({
    where: { apiFootballId: 9999 },
    update: {},
    create: {
      apiFootballId: 9999,
      homeTeam: 'Olimpia',
      awayTeam: 'Cerro Porteño',
      startTime: new Date(),
      status: MatchStatus.LIVE,
      scoreHome: 1,
      scoreAway: 0,
    },
  });

  // 5. Crear Premios de prueba en el catálogo
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
