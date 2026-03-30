// Simple DI container for services
import { AuthService } from "../../src/core/auth/auth.service";

export const AppModule = {
  authService: new AuthService(),
};