import { prisma } from "../prisma/index.js";
import { bcrypt } from "../utils/bcrypt.js";

class UserService {
    signUp = async (input) => {
        try {
            const hashedPassword = await bcrypt.hash(input.password);
            await prisma.user.create({
                data: { ...input, password: hashedPassword },
            });
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    };

    login = async (input) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    email: input.email,
                },
            });

            if (!user) throw new Error("Invalid Credentials");

            const isPasswordMatches = bcrypt.compare(
                input.password,
                user.password
            );
            if (!isPasswordMatches) {
                throw new Error("Invalid Credentials");
            }
        } catch (error) {
            throw error;
        }
    };
}

export const userService = new UserService();
