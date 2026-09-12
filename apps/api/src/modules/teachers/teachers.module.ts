import { Module } from "@nestjs/common";
import { TeachersController } from "./teachers.controller";
import { TeachersPolicy } from "./teachers.policy";
import { TeachersService } from "./teachers.service";

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, TeachersPolicy],
})
export class TeachersModule {}
