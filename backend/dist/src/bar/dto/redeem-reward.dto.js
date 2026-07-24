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
exports.RedeemRewardDto = void 0;
const class_validator_1 = require("class-validator");
class RedeemRewardDto {
    claimCode;
}
exports.RedeemRewardDto = RedeemRewardDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'El código de canje es requerido.' }),
    (0, class_validator_1.Length)(4, 4, { message: 'El código debe tener exactamente 4 caracteres.' }),
    (0, class_validator_1.Matches)(/^[A-Z0-9]+$/, { message: 'El código solo debe contener letras mayúsculas y números.' }),
    __metadata("design:type", String)
], RedeemRewardDto.prototype, "claimCode", void 0);
//# sourceMappingURL=redeem-reward.dto.js.map