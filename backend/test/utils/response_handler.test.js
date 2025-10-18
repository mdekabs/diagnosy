import { expect } from 'chai';
import sinon from 'sinon';
import HttpStatus from 'http-status-codes';
import responseHandler from '../../utils/response_handler.js';

describe('responseHandler', () => {
    let res;
    let statusStub;
    let jsonStub;

    beforeEach(() => {
        // Create stubs for res.status and res.json
        res = {
            status: () => {},
            json: () => {}
        };
        statusStub = sinon.stub(res, 'status').returns(res);
        jsonStub = sinon.stub(res, 'json');
    });

    afterEach(() => {
        // Restore stubs after each test
        sinon.restore();
    });

    it('should call res.status with the provided httpCode', () => {
        const httpCode = HttpStatus.OK;
        const type = 'success';
        const message = 'Operation successful';
        responseHandler(res, httpCode, type, message);

        expect(statusStub.calledOnceWith(httpCode)).to.be.true;
    });

    it('should call res.json with the correct response object', () => {
        const httpCode = HttpStatus.OK;
        const type = 'success';
        const message = 'Operation successful';
        const data = { key: 'value' };

        responseHandler(res, httpCode, type, message, data);

        expect(jsonStub.calledOnce).to.be.true;
        expect(jsonStub.calledWith({
            type,
            message,
            ...data
        })).to.be.true;
    });

    it('should handle empty data object correctly', () => {
        const httpCode = HttpStatus.NOT_FOUND;
        const type = 'error';
        const message = 'Resource not found';

        responseHandler(res, httpCode, type, message);

        expect(jsonStub.calledWith({
            type,
            message
        })).to.be.true;
    });

    it('should handle different HTTP status codes', () => {
        const type = 'success';
        const message = 'Test message';
        
        const testCases = [
            HttpStatus.OK,
            HttpStatus.CREATED,
            HttpStatus.BAD_REQUEST
        ];

        testCases.forEach(httpCode => {
            responseHandler(res, httpCode, type, message);
            expect(statusStub.calledWith(httpCode)).to.be.true;
            statusStub.resetHistory();
        });
    });

    it('should merge data object properties into the response', () => {
        const httpCode = HttpStatus.OK;
        const type = 'success';
        const message = 'Operation successful';
        const data = { id: 1, name: 'Test' };

        responseHandler(res, httpCode, type, message, data);

        expect(jsonStub.calledWith({
            type,
            message,
            id: 1,
            name: 'Test'
        })).to.be.true;
    });
});
