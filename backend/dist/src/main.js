"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
    const rawPort = process.env.PORT || 3001;
    const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : rawPort;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Backend de PulsoBet escuchando en http://0.0.0.0:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map