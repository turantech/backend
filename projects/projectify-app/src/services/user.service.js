import { prisma } from "../prisma/index.js";
import { crypto } from "../utils/crypto.js";
import { mailer } from "../utils/mailer.js";
import { bcrypt } from "../utils/bcrypt.js";
import { date } from "../utils/date.js";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { CustomError } from "../utils/custom-error.js";

class UserService {
    signUp = async (input) => {
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
    };

    login = async (input) => {
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

        if (!user) throw new CustomError("User does not exist", 404);

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

            throw new CustomError(
                "We just sent you activation email. Follow instructions",
                400
            );
        }

        const isPasswordMatches = await bcrypt.compare(
            input.password,
            user.password
        );
        if (!isPasswordMatches) {
            throw new CustomError("Invalid Credentials", 401);
        }

        const token = jwt.sign(
            {
                userId: user.id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2 days",
            }
        );

        return token;
    };

    activate = async (token) => {
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
            throw new CustomError(
                "User does not exist with with provided Activation Token",
                404
            );
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                status: "ACTIVE",
                activationToken: null,
            },
        });
    };

    forgotPassword = async (email) => {
        const user = await prisma.user.findFirst({
            where: {
                email,
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            throw new CustomError(
                "User does not exist with provided email",
                404
            );
        }

        const passwordResetToken = crypto.createToken();
        const hashedPasswordResetToken = crypto.hash(passwordResetToken);

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordResetToken: hashedPasswordResetToken,
                passwordResetTokenExpirationDate: date.addMinutes(10),
            },
        });

        await mailer.sendPasswordResetToken(email, passwordResetToken);
    };

    resetPassword = async (token, password) => {
        const hashedPasswordResetToken = crypto.hash(token);
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedPasswordResetToken,
            },
            select: {
                id: true,
                passwordResetToken: true,
                passwordResetTokenExpirationDate: true,
            },
        });

        if (!user) {
            throw new CustomError(
                "User does not exist with  provided Password Reset Token",
                404
            );
        }

        const currentTime = new Date();
        const tokenExpDate = new Date(user.passwordResetTokenExpirationDate);

        if (tokenExpDate < currentTime) {
            // Token Expired;
            throw new CustomError(
                "Password Reset Token Expired: Request a new one",
                400
            );
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: await bcrypt.hash(password),
                passwordResetToken: null,
                passwordResetTokenExpirationDate: null,
            },
        });
    };

    getMe = async (userId) => {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                firstName: true,
                lastName: true,
                preferredFirstName: true,
                email: true,
            },
        });

        if (!user) {
            throw new Error("User does not exist anymore, 404");
        }

        return user;
    };

    createTask = async (userId, input) => {
        const id = uuid();
        const task = {
            ...input,
            status: "TODO",
            id,
        };

        try {
            await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    tasks: {
                        push: task,
                    },
                },
            });

            return task;
        } catch (error) {
            throw error;
        }
    };

    getTasks = async (userId) => {
        try {
            const tasks = await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    tasks: true,
                },
            });

            return tasks;
        } catch (error) {
            throw error;
        }
    };

    getTask = async (userId, taskId) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    tasks: true,
                },
            });

            const task = user.tasks.find((task) => task.id === taskId);
            if (!task) {
                throw new Error("Task not found");
            }

            return task;
        } catch (error) {
            throw error;
        }
    };

    deleteTask = async (userId, taskId) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    tasks: true,
                },
            });

            const tasksToKeep = user.tasks.filter((task) => task.id !== taskId);
            console.log(tasksToKeep);

            if (tasksToKeep.length === user.tasks.length) {
                throw new Error("Task not found");
            }

            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: {
                    tasks: tasksToKeep,
                },
            });
        } catch (error) {
            throw error;
        }
    };

    updateTask = async (userId, taskId, input) => {
        console.log("helo");
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },

                select: {
                    tasks: true,
                },
            });

            const tasksNotToUpdate = [];
            let taskToUpdate = null;

            user.tasks.forEach((task) => {
                if (task.id === taskId) {
                    taskToUpdate = task;
                } else {
                    tasksNotToUpdate.push(task);
                }
            });

            if (!taskToUpdate) {
                throw new Error("Task not found");
            }

            const updatedTask = {
                ...taskToUpdate,
                ...input,
            };

            await prisma.user.update({
                where: {
                    id: userId,
                },

                data: {
                    tasks: [...tasksNotToUpdate, updatedTask],
                },
            });
        } catch (error) {
            throw error;
        }
    };
}

export const userService = new UserService();
