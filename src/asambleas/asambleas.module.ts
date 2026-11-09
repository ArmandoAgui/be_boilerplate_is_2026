import { Module } from '@nestjs/common';
import { AsambleasController } from './asambleas.controller.js';
import { AsambleasService } from './asambleas.service.js';
import { AsambleasRepository } from './asambleas.repository.js';
@Module({controllers:[AsambleasController],providers:[AsambleasService,AsambleasRepository]})
export class AsambleasModule{}
