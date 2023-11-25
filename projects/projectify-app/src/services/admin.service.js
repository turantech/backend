import { prisma } from "../prisma/index.js";
import { hashFunction, generateSalt } from "../utils/hash.js";

class AdminService {
    signUp = async (input) => {
        try {
            const salt = generateSalt();

            const hashedPassword = hashFunction(input.password + salt);
            await prisma.admin.create({
                data: { ...input, password: `${salt}.${hashedPassword}` }
            });
        } catch (error) {
            throw new Error(error);
        }
    };

    login = async (input) => {
        try {
            const admin = await prisma.admin.findFirst({
                where: {
                    email: input.email
                }
            });

            if (!admin) {
                throw new Error("Invalid Credentials");
            }
            const [salt, adminHashedPassword] = admin.password.split(".");

            const hashedPassword = hashFunction(input.password + salt);
            if (adminHashedPassword !== hashedPassword) {
                throw new Error("Invalid Credentials");
            }
        } catch (error) {
            throw error;
        }
    };
}

export const adminService = new AdminService();
