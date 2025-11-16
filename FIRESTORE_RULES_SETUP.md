# Firestore Security Rules Setup Guide

## Problem
If you're seeing errors like:
```
FirebaseError: Missing or insufficient permissions
```

This means your Firestore security rules need to be configured.

## Solution: Set Up Firestore Security Rules

### Option 1: Using Firebase Console (Recommended)

1. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com
   - Select your project

2. **Navigate to Firestore Rules**:
   - Click **Firestore Database** in the left sidebar
   - Click on the **Rules** tab

3. **Copy and Paste the Rules**:
   - Open the `firestore.rules` file in this project
   - Copy all the content
   - Paste it into the Firebase Console Rules editor

4. **Publish the Rules**:
   - Click **Publish** button
   - Wait for confirmation that rules are published

### Option 2: Using Firebase CLI

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use the existing `firestore.rules` file

4. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What These Rules Do

### Orders Collection
- **Read**: Customers can read their own orders, farmers can read orders for their products, admins can read all
- **Create**: Authenticated users can create orders (as customers)
- **Update**: Customers and farmers can update orders (for status changes)
- **Delete**: Only admins can delete orders

### Products Collection
- **Read**: Anyone can read products (public marketplace)
- **Create**: Authenticated users can create products
- **Update/Delete**: Users can only modify their own products (or admins can modify any)

### Users Collection
- **Read**: Authenticated users can read user data
- **Write**: Users can only write their own data

### Farmer Applications Collection
- **Read**: Users can read their own applications, admins can read all
- **Create**: Authenticated users can create applications
- **Update/Delete**: Only admins can update or delete applications

## Testing the Rules

After deploying the rules:

1. **Test as Customer**:
   - Log in as a consumer
   - Go to Dashboard → View My Orders
   - Should see your orders (if any exist)

2. **Test as Farmer**:
   - Log in as a farmer
   - Go to Admin Panel → Orders tab
   - Should see orders for your products

3. **Check Console**:
   - Open browser console (F12)
   - Should NOT see "Missing or insufficient permissions" errors
   - Should see order data being fetched

## Troubleshooting

### Still Getting Permission Errors?

1. **Wait a few minutes**: Rules can take 1-2 minutes to propagate

2. **Check User Authentication**:
   - Make sure you're logged in
   - Check if `request.auth` is not null in the rules

3. **Verify User ID Matches**:
   - Check browser console for logged-in user ID
   - Verify it matches the `customerId` or `farmerId` in orders

4. **Check Rule Syntax**:
   - Make sure there are no syntax errors in the rules
   - Firebase Console will highlight errors in red

5. **Test in Firebase Console**:
   - Go to Firestore Database → Rules tab
   - Click "Rules Playground" to test rules interactively

### Common Issues

**Issue**: "resource.data.customerId is undefined"
- **Solution**: Make sure orders have `customerId` field set when created

**Issue**: "request.auth.token.role is undefined"
- **Solution**: The role check is optional - orders should still work if you're the customer or farmer

**Issue**: Rules work but orders still don't show
- **Solution**: Check the console logs - orders might not be getting saved, or farmerId might be "unknown"

## Need More Help?

- Firebase Firestore Security Rules Docs: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Console: https://console.firebase.google.com




