interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
}

interface GoogleButtonRenderOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfig) => void;
        renderButton: (element: HTMLElement, options: GoogleButtonRenderOptions) => void;
        prompt: (notification?: (notification: unknown) => void) => void;
        cancel?: () => void;
      };
    };
  };
}
