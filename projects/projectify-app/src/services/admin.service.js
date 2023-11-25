import { prisma } from "../prisma/index.js";
import { crypto } from "../utils/crypto.js";
import { mailer } from "../utils/mailer.js";
import { bcrypt } from "../utils/bcrypt.js";
import { date } from "../utils/date.js";
import jwt from "jsonwebtoken";

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

            const token = jwt.sign(
                {
                    adminId: admin.id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "2 days"
                }
            );

            return token;
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
                    activationToken: null
                }
            });
        } catch (error) {
            throw error;
        }
    };

    forgotPassword = async (email) => {
        try {
            const admin = await prisma.admin.findFirst({
                where: {
                    email
                },
                select: {
                    id: true
                }
            });

            if (!admin) {
                throw new Error(
                    "We could not find a admin with the email you provided"
                );
            }

            const passwordResetToken = crypto.createToken();
            const hashedPasswordResetToken = crypto.hash(passwordResetToken);

            await prisma.admin.update({
                where: {
                    id: admin.id
                },
                data: {
                    passwordResetToken: hashedPasswordResetToken,
                    passwordResetTokenExpirationDate: date.addMinutes(10)
                }
            });

            await mailer.sendPasswordResetToken(email, passwordResetToken);
        } catch (error) {
            throw error;
        }
    };

    resetPassword = async (token, password) => {
        try {
            const hashedPasswordResetToken = crypto.hash(token);
            const admin = await prisma.admin.findFirst({
                where: {
                    passwordResetToken: hashedPasswordResetToken
                },
                select: {
                    id: true,
                    passwordResetToken: true,
                    passwordResetTokenExpirationDate: true
                }
            });

            if (!admin) {
                throw new Error("Invalid Token");
            }

            const currentTime = new Date();
            const tokenExpDate = new Date(
                admin.passwordResetTokenExpirationDate
            );

            if (tokenExpDate < currentTime) {
                // Token Expired;
                throw new Error("Reset Token Expired");
            }

            await prisma.admin.update({
                where: {
                    id: admin.id
                },
                data: {
                    password: await bcrypt.hash(password),
                    passwordResetToken: null,
                    passwordResetTokenExpirationDate: null
                }
            });
        } catch (error) {
            throw error;
        }
    };

    getMe = async (adminId) => {
        try {
            const admin = await prisma.admin.findUnique({
                where: {
                    id: adminId
                },
                select: {
                    firstName: true,
                    lastName: true,
                    preferredFirstName: true,
                    email: true
                }
            });

            if (!admin) {
                throw new Error("Admin not found");
            }

            return admin;
        } catch (error) {
            throw error;
        }
    };
}

export const adminService = new AdminService();
