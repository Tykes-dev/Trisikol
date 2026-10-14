package com.trisikol.trisikol_backend.auth;

/** Replace the local adapter with a verified side-channel provider before deployment. */
public interface ResetDelivery {
    boolean available();
    void deliver(String mobile, String token);
}
