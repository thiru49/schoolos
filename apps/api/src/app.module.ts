import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AcademicsModule } from "./modules/academics/academics.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { FilesModule } from "./modules/files/files.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ParentsModule } from "./modules/parents/parents.module";
import { StudentsModule } from "./modules/students/students.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtOptionalMiddleware } from "./common/middleware/jwt-optional.middleware";

@Module({
  providers: [JwtOptionalMiddleware],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    TenancyModule,
    RbacModule,
    AuthModule,
    BrandingModule,
    UsersModule,
    AcademicsModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    AttendanceModule,
    FilesModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtOptionalMiddleware).forRoutes("*");
  }
}
