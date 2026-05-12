declare module "node-zklib" {
  interface AttendanceLog {
    deviceUserId: string | number;
    attTime: string | Date;
    verifyType?: number;
    inOutStatus?: number;
  }

  class ZKLib {
    constructor(ip: string, port: number, timeout?: number, inport?: number);
    createSocket(): Promise<void>;
    getAttendances(): Promise<{ data: AttendanceLog[] }>;
    disconnect(): Promise<void>;
  }

  export = ZKLib;
}
