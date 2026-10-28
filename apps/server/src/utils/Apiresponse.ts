class Apiresponse<T = any> {
  statusCode: number;
  message: any;
  data: T;
  success: boolean;

  constructor(statusCode: number, message: any, data: any = "Success") {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
}

export { Apiresponse };
