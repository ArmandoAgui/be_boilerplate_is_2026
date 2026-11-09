import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
export class TemaEntradaDto {
 @IsString() @Length(5,150) pregunta!:string;
 @IsISO8601({strict:true}) aperturaAt!:string;
 @IsISO8601({strict:true}) cierreAt!:string;
 @IsArray() @ArrayMinSize(2) @ArrayMaxSize(10) @IsString({each:true}) @Length(1,100,{each:true}) opciones!:string[];
}
export class CrearAsambleaDto {
 @IsString() @Length(5,100) titulo!:string;
 @IsISO8601({strict:true}) fechaAt!:string;
 @IsOptional() @IsString() @MaxLength(500) descripcion?:string;
 @IsArray() @ValidateNested({each:true}) @Type(()=>TemaEntradaDto) temas!:TemaEntradaDto[];
}
export class PublicarAsambleaDto { @IsOptional() @IsUUID() confirmacion?:string; }
export class VotarDto { @IsUUID() unidadId!:string; @IsUUID() opcionId!:string; }
export class MiEstadoVotoDto { @IsUUID() unidadId!:string; }
