import { prisma } from "../prisma/index.js";

class AdminService {
    signUp = async (input) => {
        try {
            await prisma.admin.create({
                data: input,
            });
        } catch (error) {
            throw new Error(error);
        }
    };
}

export const adminService = new AdminService();
