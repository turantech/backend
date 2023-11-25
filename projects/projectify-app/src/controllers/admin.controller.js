import { adminService } from "../services/admin.service.js";

class AdminController {
    signUp = async (req, res) => {
        const { body } = req;

        const input = {
            email: body.email,
            preferredFirstName: body.preferredName,
            firstName: body.firstName,
            lastName: body.lastName,
            password: body.password
        };

        try {
            await adminService.signUp(input);
            res.status(201).json({
                message: "Success"
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    };

    login = async (req, res) => {
        const { body } = req;
        const input = {
            email: body.email,
            password: body.password
        };

        try {
            await adminService.login(input);

            res.status(200).json({
                message: "Success"
            });
        } catch (error) {
            let statusCode = 500;
            if (error.message === "Invalid Credentials") {
                statusCode = 401;
            }
            res.status(statusCode).json({
                message: error.message
            });
        }
    };
}

export const adminController = new AdminController();
