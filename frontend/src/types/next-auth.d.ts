import "next-auth";
import { UserRole } from "./api";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user?: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            id?: string;
            role?: UserRole;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        userId?: string;
        userRole?: UserRole;
    }
}
