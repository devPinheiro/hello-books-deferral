import faker from 'faker';
import config from '@config';
import jwt from 'jsonwebtoken';
import User from '@models/User';
import { Response } from '@tests/utils/helpers';
import { app, databaseConnection } from '@server/app';
import { isAuthenticated } from '@middleware/auth/authenticate';

const getUser = () => ({
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: faker.internet.email(),
    password_confirmation: 'secret0001',
    password: 'secret0001',
    settings: {
        email_notify: 1,
        in_app_notify: 1
    }
});

describe('Auth middleware', () => {
    it('should return an error if token is not provided', async () => {
        const req = {
            headers: {}
        };

        const res = new Response();
        const statusSpy = jest.spyOn(res, 'status');
        const jsendSpy = jest.spyOn(res, 'jsend');
        const next = () => {};

        isAuthenticated(req, res, next);

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsendSpy).toHaveBeenCalledWith({ message: 'Unauthenticated' });
    });
    it('should call the next function if user is valid', async () => {
        const user = getUser();

        const createdUser = await User.query().insert({
            email: user.email,
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            settings: {
                email_notify: 1,
                in_app_notify: 1
            }
        });

        const token = jwt.sign(
            { id: createdUser.id, email: createdUser.email },
            config.auth.secret
        );

        const req = {
            headers: {
                'x-access-token': token
            }
        };
        const res = new Response();
        const next = jest.fn();

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
