"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePartyRoundDto = void 0;
const class_validator_1 = require("class-validator");
class CreatePartyRoundDto {
    sessionId;
    gameType;
    prompt;
    categories;
    realAnswer;
    timeLimit;
}
exports.CreatePartyRoundDto = CreatePartyRoundDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'El sessionId es requerido.' }),
    __metadata("design:type", String)
], CreatePartyRoundDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['BLUFFING', 'TUTI_FRUTI', 'SOCIAL_JUDGMENT'], {
        message: 'El tipo de juego debe ser BLUFFING, TUTI_FRUTI o SOCIAL_JUDGMENT.',
    }),
    __metadata("design:type", String)
], CreatePartyRoundDto.prototype, "gameType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'El prompt (premisa/letra/consigna) es requerido.' }),
    __metadata("design:type", String)
], CreatePartyRoundDto.prototype, "prompt", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true, message: 'Cada categoría debe ser un texto.' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePartyRoundDto.prototype, "categories", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePartyRoundDto.prototype, "realAnswer", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(15, { message: 'El tiempo límite mínimo es 15 segundos.' }),
    (0, class_validator_1.Max)(300, { message: 'El tiempo límite máximo es 300 segundos.' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePartyRoundDto.prototype, "timeLimit", void 0);
//# sourceMappingURL=create-round.dto.js.map