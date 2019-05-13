import auth from '@routes/v1/auth';
import author from '@routes/v1/author';
import books from '@routes/v1/books';
import notifications from '@routes/v1/notifications';
import user from '@routes/v1/user';
import bookRequest from '@routes/v1/bookRequest';
import fines from '@routes/v1/fines';
import profile from '@routes/v1/profile';
export default app => {
    app.use('/api/v1/auth', auth);
    app.use('/api/v1/authors', author);
    app.use('/api/v1/books', books);
    app.use('/api/v1/notifications', notifications);
    app.use('/api/v1/users', user);
    app.use('/api/v1/book-request', bookRequest);
    app.use('/api/v1/fines', fines);
    app.use('/api/v1/profile', profile);
};
