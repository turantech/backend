import { prisma } from "../prisma/index.js";
import { crypto } from "../utils/crypto.js";
import { mailer } from "../utils/mailer.js";
import { bcrypt } from "../utils/bcrypt.js";

class UserService {
    signUp = async (input) => {
        try {
            const hashedPassword = await bcrypt.hash(input.password);
            const activationToken = crypto.createToken();
            const hashedActivationToken = crypto.hash(activationToken);
            await prisma.user.create({
                data: {
                    ...input,
                    password: hashedPassword,
                    activationToken: hashedActivationToken,
                },
            });
            await mailer.sendActivationMail(input.email, activationToken);
        } catch (error) {
            throw new Error(error);
        }
    };

    login = async (input) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    email: input.email,
                },
                select: {
                    id: true,
                    status: true,
                    password: true,
                },
            });

            if (!user) throw new Error("Invalid Credentials");

            if (user.status === "INACTIVE") {
                const activationToken = crypto.createToken();
                const hashedActivationToken = crypto.hash(activationToken);

                await prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        activationToken: hashedActivationToken,
                    },
                });

                await mailer.sendActivationMail(input.email, activationToken);

                throw new Error(
                    "We just sent you activation email. Follow instructions"
                );
            }

            const isPasswordMatches = await bcrypt.compare(
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

    activate = async (token) => {
        try {
            const hashedActivationToken = crypto.hash(token);
            const user = await prisma.user.findFirst({
                where: {
                    activationToken: hashedActivationToken,
                },
                select: {
                    id: true,
                    activationToken: true,
                },
            });

            if (!user) {
                throw new Error("Invalid Token");
            }

            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    status: "ACTIVE",
                    activationToken: "",
                },
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    };
}

export const userService = new UserService();
