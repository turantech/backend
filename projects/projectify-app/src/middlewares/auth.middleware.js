import jwt from "jsonwebtoken";
class AuthMiddleware {
    authenticate = (req, res, next) => {
        const { headers } = req;
        if (!headers.authorization) {
            res.status(401).json({
                message: "You are not logged in. Please, log in",
            });
            return;
        }
        const [prefix, token] = headers.authorization.split(" ");

        if (!prefix || !token) {
            res.status(400).json({
                message: "Not Valid Token",
            });

            return;
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            if (payload.adminId) {
                req.adminId = payload.adminId;
            }

            if (payload.teamMember) {
                req.teamMember = payload.teamMember;
            }

            next();
        } catch (error) {
            res.status(500).json({
                error: error.message,
            });
        }
    };
}

export const authMiddleware = new AuthMiddleware();
