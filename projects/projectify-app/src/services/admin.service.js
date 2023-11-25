import { prisma } from "../prisma/index.js";
import { bcrypt } from "../utils/bcrypt.js";

class AdminService {
    signUp = async (input) => {
        try {
            const hashedPassword = await bcrypt.hash(input.password);
            await prisma.admin.create({
                data: { ...input, password: hashedPassword }
            });
        } catch (error) {
            console.log(error);
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

            if (!admin) throw new Error("Invalid Credentials");

            const isPasswordMatches = bcrypt.compare(
                input.password,
                admin.password
            );
            if (!isPasswordMatches) {
                throw new Error("Invalid Credentials");
            }
        } catch (error) {
            throw error;
        }
    };
}

export const adminService = new AdminService();
