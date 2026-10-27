interface SectionHeaderProps {
    label: string;
    annotation?: string;
}

export function SectionHeader({ label, annotation }: SectionHeaderProps) {
    return (
        <div className="section-hdr" data-testid="section-header">
            <span className="section-hdr__label">{label}</span>
            <span className="section-hdr__rule" />
            {annotation && (
                <span className="section-hdr__coords">{annotation}</span>
            )}
        </div>
    );
}
