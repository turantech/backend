import { prisma } from "../prisma/index.js";
import { crypto } from "../utils/crypto.js";
import { mailer } from "../utils/mailer.js";
import { bcrypt } from "../utils/bcrypt.js";

class AdminService {
    signUp = async (input) => {
        try {
            const hashedPassword = await bcrypt.hash(input.password);
            const activationToken = crypto.createToken();
            const hashedActivationToken = crypto.hash(activationToken);
            await prisma.admin.create({
                data: {
                    ...input,
                    password: hashedPassword,
                    activationToken: hashedActivationToken
                }
            });
            await mailer.sendActivationMail(input.email, activationToken);
        } catch (error) {
            throw new Error(error);
        }
    };

    login = async (input) => {
        try {
            const admin = await prisma.admin.findFirst({
                where: {
                    email: input.email
                },
                select: {
                    id: true,
                    status: true,
                    password: true
                }
            });

            if (!admin) throw new Error("Invalid Credentials");

            if (admin.status === "INACTIVE") {
                const activationToken = crypto.createToken();
                const hashedActivationToken = crypto.hash(activationToken);

                await prisma.admin.update({
                    where: {
                        id: admin.id
                    },
                    data: {
                        activationToken: hashedActivationToken
                    }
                });

                await mailer.sendActivationMail(input.email, activationToken);

                throw new Error(
                    "We just sent you activation email. Follow instructions"
                );
            }

            const isPasswordMatches = await bcrypt.compare(
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

    activate = async (token) => {
        try {
            const hashedActivationToken = crypto.hash(token);
            const admin = await prisma.admin.findFirst({
                where: {
                    activationToken: hashedActivationToken
                },
                select: {
                    id: true,
                    activationToken: true
                }
            });

            if (!admin) {
                throw new Error("Invalid Token");
            }

            await prisma.admin.update({
                where: {
                    id: admin.id
                },
                data: {
                    status: "ACTIVE",
                    activationToken: ""
                }
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    };
}

export const adminService = new AdminService();
