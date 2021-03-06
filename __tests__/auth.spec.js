import supertest from 'supertest';
import Bcrypt from 'bcryptjs';
import { app, databaseConnection } from '@server/app';
import {
    getUser,
    createUser,
    findUser,
    superAdminUser
} from '@tests/utils/helpers';
import jwt from 'jsonwebtoken';
import config from '@config';

const server = () => supertest(app);
let emailReset;

describe('AUTH API ENDPOINTS', () => {
    beforeAll(async () => {
        await databaseConnection.migrate.latest();
        await databaseConnection('users').truncate();
    });

    afterAll(async () => {
        await databaseConnection('users').truncate();
    });

    describe('POST SIGN UP api/v1/auth/signup', () => {
        it('should not sign up user if email is empty', async () => {
            const { status, body } = await server()
                .post('/api/v1/auth/signup')
                .send({
                    ...getUser(),
                    email: ''
                });

            expect(status).toBe(422);
            expect(body).toMatchSnapshot();
        });

        it('should sign up user with valid inputs', async () => {
            const user = getUser();
            const { status, body } = await server()
                .post('/api/v1/auth/signup')
                .send(user);

            expect(status).toBe(201);
            expect(body.data.user.email).toBe(user.email);
            expect(Object.keys(body.data)).toMatchSnapshot();
        });

        it('should not sign up user that is already registered', async () => {
            const user = getUser();
            await createUser(user);

            const { status, body } = await server()
                .post('/api/v1/auth/signup')
                .send(user);

            expect(status).toBe(422);
            expect(body).toMatchSnapshot();
        });

        it('should not verify an email with a wrong verification code', async () => {
            const { status, body } = await server()
                .post('/api/v1/auth/verify/:thisistherandomstring')
                .send();

            expect(status).toBe(400);
            expect(body).toMatchSnapshot();
        });

        it('should verify an email with a good verification code', async () => {
            const user = getUser();
            const { email_confirm_code } = await createUser(user);

            const { status, body } = await server().post(
                `/api/v1/auth/verify/${email_confirm_code}`
            );

            expect(status).toBe(200);
            expect(body).toMatchSnapshot();
        });
    });

    describe('POST LOGIN api/v1/auth/login', () => {
        it('should login usser with valid inputs', async () => {
            const userDetails = getUser();

            await createUser(userDetails);
            const { status, body } = await server()
                .post('/api/v1/auth/login')
                .send(userDetails);

            expect(status).toBe(200);
            expect(body.data.token).toBeDefined();
        });

        it('should reject login if email is not found ', async () => {
            const userDetails = getUser();

            const { status, body } = await server()
                .post('/api/v1/auth/login')
                .send(userDetails);

            expect(status).toBe(400);
            expect(body).toMatchSnapshot();
        });

        it('should reject login if password is wrong ', async () => {
            const userDetails = getUser();
            await createUser(userDetails);
            const { status, body } = await server()
                .post('/api/v1/auth/login')
                .send({
                    email: userDetails.email,
                    password: 'WRONG_PASSWORD'
                });

            expect(status).toBe(400);
            expect(body).toMatchSnapshot();
        });
    });

    describe('POST PASSWORD RESET api/v1/auth/reset', () => {
        it('should not send mail if user email is invalid', async () => {
            const { status, body } = await server()
                .post('/api/v1/auth/reset')
                .send({ email: 'ba@ gmail' });

            expect(status).toBe(422);
            expect(body).toMatchSnapshot();
        });

        it('should not send mail if user is not found', async () => {
            const { status, body } = await server()
                .post('/api/v1/auth/reset')
                .send({ email: 'bambam@gmail.com' });

            expect(status).toBe(404);
            expect(body).toMatchSnapshot();
        });

        it('should send email if user is valid', async () => {
            const user = getUser();
            await createUser(user);
            emailReset = user.email;

            const { status, body } = await server()
                .post('/api/v1/auth/reset')
                .send({ email: emailReset });

            expect(status).toBe(200);
            expect(Object.keys(body.data)).toMatchSnapshot();
        });
    });

    describe('PATCH PASSWORD RESET api/v1/auth/reset', () => {
        it('should not reset password if token is invalid', async () => {
            const { status, body } = await server()
                .patch('/api/v1/auth/reset')
                .send({
                    password: 'qwert12345',
                    token: 'resettoken'
                });

            expect(status).toBe(422);
            expect(body).toMatchSnapshot();
        });

        it('should not reset password if password is invalid', async () => {
            const { status, body } = await server()
                .patch('/api/v1/auth/reset')
                .send({
                    password: 'qwert',
                    token: 'resettoken'
                });

            expect(status).toBe(422);
            expect(body).toMatchSnapshot();
        });

        it.skip('should reset password if all inputs are valid', async () => {
            let user = await findUser(emailReset);
            const resettoken = user[0].resettoken;
            const { status, body } = await server()
                .patch('/api/v1/auth/reset')
                .send({
                    password: 'qwert12345',
                    token: resettoken
                });
            user = await findUser(emailReset);
            expect(status).toBe(200);
            expect(Bcrypt.compareSync('qwert12345', user[0].password)).toBe(
                true
            );
            expect(body).toMatchSnapshot();
        }, 30000);
    });

    describe('POST CREATE USER api/v1/auth/create-user', () => {
        it('A super-admin should be able to create a normal user', async () => {
            const user = getUser();
            const admin = await superAdminUser(user);

            const token = jwt.sign(
                { id: admin.id, email: admin.email },
                config.auth.secret
            );

            const { status, body } = await server()
                .post('/api/v1/auth/create-user')
                .set('x-access-token', token)
                .send({
                    ...getUser()
                });

            expect(status).toBe(201);
            expect(body).toMatchSnapshot();
        });
    });
});
