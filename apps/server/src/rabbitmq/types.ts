export type MediaUploadJob =
  | {
      type: "GROUP_AVATAR";
      targetId: number;
      filePath: string;
      userId: number;
    }
  | {
      type: "USER_AVATAR";
      targetId: number;
      filePath: string;
    };

export interface ChatEventMessage {
  event: string;
  room: string;
  data: any;
}

export interface CallTimeoutMessage {
  callId: number | string;
  callerId?: number | string | null;
}

