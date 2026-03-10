# Modal Component Usage Guide

This guide demonstrates how to use the new Modal component to replace native `alert()` and `confirm()` dialogs throughout your application.

## Setup

The `ModalProvider` is already configured in `App.tsx` and wraps your entire application, so the modal is available everywhere.

## Basic Usage

### Import the hook

```tsx
import { useModal } from '../components/ModalContext';
```

### Inside your component

```tsx
const MyComponent = () => {
  const { showAlert, showConfirm, showCustomModal } = useModal();
  
  // Your component logic
};
```

## Examples

### 1. Simple Alert (replacing `alert()`)

**Before:**
```tsx
alert('Operation completed successfully!');
```

**After:**
```tsx
showAlert('Operation completed successfully!', {
  title: 'Success',
  variant: 'success'
});
```

### 2. Error Alert

**Before:**
```tsx
alert('Error saving student');
```

**After:**
```tsx
showAlert('Error saving student', {
  title: 'Error',
  variant: 'danger'
});
```

### 3. Confirmation Dialog (replacing `window.confirm()`)

**Before:**
```tsx
if (window.confirm('Are you sure you want to delete this item?')) {
  deleteItem();
}
```

**After:**
```tsx
const handleDelete = async () => {
  const confirmed = await showConfirm(
    'Are you sure you want to delete this item? This action cannot be undone.',
    {
      title: 'Delete Confirmation',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  );
  
  if (confirmed) {
    deleteItem();
  }
};
```

### 4. Logout Confirmation

**Before:**
```tsx
if (window.confirm('Are you sure you want to logout?')) {
  // logout logic
}
```

**After:**
```tsx
const handleLogout = async () => {
  const confirmed = await showConfirm(
    'Are you sure you want to logout?',
    {
      title: 'Confirm Logout',
      variant: 'warning',
      confirmText: 'Logout',
      cancelText: 'Cancel'
    }
  );
  
  if (confirmed) {
    // logout logic
  }
};
```

### 5. Submit Evaluation Confirmation

**Before:**
```tsx
if (!window.confirm('Are you sure you want to submit this evaluation? You cannot edit it after submission.')) {
  return;
}
// submit logic
```

**After:**
```tsx
const handleSubmit = async () => {
  const confirmed = await showConfirm(
    'Are you sure you want to submit this evaluation? You cannot edit it after submission.',
    {
      title: 'Submit Evaluation',
      variant: 'warning',
      confirmText: 'Submit',
      cancelText: 'Cancel'
    }
  );
  
  if (!confirmed) return;
  
  // submit logic
};
```

### 6. Custom Modal with Custom Content

```tsx
const handleCustomAction = () => {
  showCustomModal(
    <div>
      <p className="text-gray-700 mb-4">
        Please review the following information before proceeding:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>All data will be processed securely</li>
        <li>This action may take a few moments</li>
        <li>You will receive a confirmation email</li>
      </ul>
    </div>,
    {
      title: 'Review Information',
      variant: 'info',
      confirmText: 'Proceed',
      cancelText: 'Cancel',
      onConfirm: () => {
        // Handle the confirm action
        console.log('User confirmed');
      }
    }
  );
};
```

### 7. Success Notification

```tsx
// After a successful operation
showAlert('Teacher added successfully!', {
  title: 'Success',
  variant: 'success',
  confirmText: 'OK'
});
```

### 8. Warning Message

```tsx
showAlert('Your session will expire in 5 minutes', {
  title: 'Session Warning',
  variant: 'warning',
  confirmText: 'I Understand'
});
```

## Modal Options

### Available Variants

- **info** (blue): General information
- **success** (green): Success messages
- **warning** (yellow): Warnings and cautions
- **danger** (red): Errors and destructive actions

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | - | Modal title |
| `message` | string | - | Modal message (for alert/confirm) |
| `variant` | string | 'info' | Visual style (info/success/warning/danger) |
| `confirmText` | string | 'OK' | Text for confirm button |
| `cancelText` | string | 'Cancel' | Text for cancel button |
| `showCloseButton` | boolean | true | Show X close button |
| `closeOnBackdropClick` | boolean | true | Close when clicking outside |

## Migration Checklist

To replace native dialogs in your files:

1. ✅ Import `useModal` hook at the top of component
2. ✅ Call `useModal()` to get the modal functions
3. ✅ Replace `alert()` with `showAlert()`
4. ✅ Replace `window.confirm()` with `await showConfirm()`
5. ✅ Choose appropriate variant and button text
6. ✅ Test the component to ensure it works

## Common Patterns

### Error Handling Pattern

```tsx
try {
  await someApiCall();
  showAlert('Operation successful!', { 
    variant: 'success',
    title: 'Success' 
  });
} catch (error) {
  showAlert(
    error.response?.data?.message || 'An error occurred',
    { 
      variant: 'danger',
      title: 'Error' 
    }
  );
}
```

### Delete Confirmation Pattern

```tsx
const handleDelete = async (id: string) => {
  const confirmed = await showConfirm(
    'This action cannot be undone. Are you sure?',
    {
      title: 'Delete Confirmation',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }
  );
  
  if (!confirmed) return;
  
  try {
    await api.delete(`/items/${id}`);
    showAlert('Item deleted successfully', { 
      variant: 'success',
      title: 'Deleted' 
    });
  } catch (error) {
    showAlert('Failed to delete item', { 
      variant: 'danger',
      title: 'Error' 
    });
  }
};
```

## Files to Update

Based on the codebase scan, these files contain native alerts/confirms:

- ✅ `TeacherNavbar.tsx` - logout confirm, error alerts
- ✅ `StudentEvaluate.tsx` - clear draft, submit confirmation
- ✅ `StudentSubjects.tsx` - logout confirm, error alerts
- ✅ `AdminStudents.tsx` - error alerts, delete confirmation
- ✅ `AdminTeachers.tsx` - error alerts, delete confirmation
- ✅ `AdminPrograms.tsx` - error alerts, delete confirmation
- ✅ `AdminCourses.tsx` - error alerts
- ✅ `AdminPrivacyAudit.tsx` - error alerts

## Benefits

✅ **Consistent UI**: All dialogs match your app's design  
✅ **Better UX**: Smooth animations and transitions  
✅ **Accessible**: Keyboard navigation (ESC to close)  
✅ **Flexible**: Support for custom content  
✅ **Type-safe**: Full TypeScript support  
✅ **Easy to use**: Simple API with async/await support

## Notes

- The modal automatically prevents body scrolling when open
- Press ESC to close the modal (configurable)
- Click outside to close (configurable)
- Fully responsive and mobile-friendly
- Styled with Tailwind CSS
