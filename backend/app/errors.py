"""Errors that are safe to show to a person using the product."""


class AppError(Exception):
    code = "processing_failed"
    status_code = 400

    def __init__(self, message: str | None = None) -> None:
        self.message = message or "We couldn't process that file."
        super().__init__(self.message)


class EmptyUploadError(AppError):
    code = "empty_upload"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Add a file before continuing.")


class TooManyFilesError(AppError):
    code = "too_many_files"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Too many files were uploaded at once.")


class FileTooLargeError(AppError):
    code = "file_too_large"
    status_code = 413

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "One of the files is larger than the allowed limit.")


class TotalTooLargeError(AppError):
    code = "total_too_large"
    status_code = 413

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Those files are larger than the total upload limit.")


class UnsupportedTypeError(AppError):
    code = "unsupported_type"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "That file type isn't supported for this tool.")


class InvalidPdfError(AppError):
    code = "invalid_pdf"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "This file isn't a valid PDF. Export it again and retry.")


class EncryptedPdfError(AppError):
    code = "encrypted_pdf"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(
            message
            or "This PDF is password-protected. Remove the password and try again."
        )


class InvalidImageError(AppError):
    code = "invalid_image"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Use a JPG or PNG image that isn't damaged.")


class TooManyPagesError(AppError):
    code = "too_many_pages"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "This PDF has more pages than the current limit.")


class InvalidRangeError(AppError):
    code = "invalid_range"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Those page numbers don't match this PDF.")


class InvalidOptionError(AppError):
    code = "invalid_option"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "Check the options and try again.")


class ProcessingFailedError(AppError):
    code = "processing_failed"
    status_code = 422

    def __init__(self, message: str | None = None) -> None:
        super().__init__(
            message
            or "We couldn't process this document. It may be damaged or use an unsupported feature."
        )


class NotFoundError(AppError):
    code = "not_found"
    status_code = 404

    def __init__(self, message: str | None = None) -> None:
        super().__init__(
            message or "That download is no longer available. Process the file again."
        )
