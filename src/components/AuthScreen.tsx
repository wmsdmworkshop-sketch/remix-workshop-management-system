import React from "react";
import { User } from "../types";
import { EnterpriseGateway } from "./EnterpriseGateway";

interface AuthScreenProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  return (
    <EnterpriseGateway 
      onLoginSuccess={(token, user) => {
        onAuthSuccess(user, token);
      }} 
    />
  );
}
